import Foundation
import StoreKit
import CryptoKit

@MainActor final class CoinPurchaseManager {
    typealias EventHandler = (String, [String: Any]) -> Void
    private let catalog: CoinCatalog?
    private let delivery: PurchaseDelivering
    private let namespace: String
    private let emit: EventHandler
    private let permittedHTTPOrigin: URL?
    private var account: PurchaseAccount?
    private var updates: Task<Void, Never>?
    private var processing = Set<UInt64>()
    private var delivered = Set<UInt64>()
    private var requests: [String: [String: Any]] = [:]
    private var purchasing = false

    init(catalog: CoinCatalog?, namespace: String, delivery: PurchaseDelivering, permittedHTTPOrigin: URL? = nil, emit: @escaping EventHandler) {
        self.catalog = catalog
        self.namespace = namespace
        self.delivery = delivery
        self.emit = emit
        self.permittedHTTPOrigin = permittedHTTPOrigin
        updates = Task { [weak self] in
            for await update in Transaction.updates {
                guard !Task.isCancelled else { return }
                await self?.process(update)
            }
        }
    }

    static func accountToken(userID: String, namespace: String) -> UUID {
        var bytes = Array(SHA256.hash(data: Data("Lunmi:\(namespace):\(userID)".utf8)).prefix(16))
        bytes[6] = (bytes[6] & 0x0f) | 0x50
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        return UUID(uuid: (bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7], bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]))
    }

    func updateSession(_ data: [String: Any]) {
        let user = Self.identifier(data["userId"])
        let token = data["token"] as? String ?? ""
        let rawURL = data["apiBaseURL"] as? String ?? ""
        let url = URL(string: rawURL)
        let validURL = url.map { NativeConfiguration.isAllowedAPIURL($0, permittedHTTPOrigin: permittedHTTPOrigin) } ?? false
        account = !user.isEmpty && !token.isEmpty ? PurchaseAccount(userID: user, accessToken: token, apiBaseURL: validURL ? url : nil) : nil
        Task { [weak self] in await self?.recoverUnfinished() }
    }

    func loadProducts(_ data: [String: Any]) async {
        var response = Self.correlation(data)
        do {
            guard let catalog else { throw PurchaseFailure.invalidProduct }
            let products = try await Product.products(for: catalog.packages.map(\.productID))
            response["success"] = true
            response["products"] = products.sorted { $0.price < $1.price }.map {
                ["productId": $0.id, "displayPrice": $0.displayPrice, "price": NSDecimalNumber(decimal: $0.price), "available": $0.type == .consumable] as [String: Any]
            }
        } catch {
            response["success"] = false
            response["code"] = "store_unavailable"
        }
        emit("APP_PRODUCTS_RESULT", response)
    }

    func purchase(_ data: [String: Any]) async {
        let productID = Self.identifier(data["productId"])
        var started = false
        do {
            guard !purchasing, requests[productID] == nil else { throw PurchaseFailure.busy }
            guard let account, account.userID == Self.identifier(data["userId"]) else { throw PurchaseFailure.notLoggedIn }
            guard let package = catalog?.package(productID: productID), package.packageID == Self.identifier(data["packageId"]) else { throw PurchaseFailure.invalidProduct }
            // Never charge a real customer if the backend cannot yet deliver their coins.
            guard delivery.isConfigured else { throw PurchaseFailure.notConfigured }
            guard AppStore.canMakePayments else { throw PurchaseFailure.unavailable }
            purchasing = true
            defer { purchasing = false }
            await recoverUnfinished()
            guard self.account == account else { throw PurchaseFailure.accountMismatch }
            for await unfinished in Transaction.unfinished {
                if case .verified(let transaction) = unfinished,
                   transaction.appAccountToken == Self.accountToken(userID: account.userID, namespace: namespace),
                   catalog?.package(productID: transaction.productID) != nil { throw PurchaseFailure.deliveryPending }
            }
            try await delivery.prepare(account: account)
            guard let product = try await Product.products(for: [productID]).first, product.type == .consumable else { throw PurchaseFailure.invalidProduct }
            guard self.account == account else { throw PurchaseFailure.accountMismatch }
            requests[productID] = data
            started = true
            let outcome = try await product.purchase(options: [.appAccountToken(Self.accountToken(userID: account.userID, namespace: namespace))])
            switch outcome {
            case .success(let verification): await process(verification)
            case .userCancelled:
                requests.removeValue(forKey: productID)
                failure(data, status: "cancelled", code: "user_cancelled")
            case .pending:
                // Approval may arrive after the current page or process is gone.
                failure(data, status: "pending", code: "approval_pending")
            @unknown default:
                requests.removeValue(forKey: productID)
                throw PurchaseFailure.unavailable
            }
        } catch {
            if started { requests.removeValue(forKey: productID) }
            failure(data, code: (error as? PurchaseFailure)?.rawValue ?? "store_unavailable")
        }
    }

    func recoverUnfinished() async {
        guard delivery.isConfigured, account != nil else { return }
        for await verification in Transaction.unfinished { await process(verification) }
    }

    private func process(_ verification: VerificationResult<Transaction>) async {
        guard case .verified(let transaction) = verification else {
            if let request = requests.removeValue(forKey: verification.unsafePayloadValue.productID) { failure(request, code: PurchaseFailure.unverified.rawValue) }
            return
        }
        guard let package = catalog?.package(productID: transaction.productID), let account,
              !processing.contains(transaction.id), !delivered.contains(transaction.id), delivery.isConfigured else { return }
        guard transaction.appAccountToken == Self.accountToken(userID: account.userID, namespace: namespace) else {
            if let request = requests.removeValue(forKey: transaction.productID) { failure(request, code: PurchaseFailure.accountMismatch.rawValue) }
            return
        }
        let request = requests[transaction.productID] ?? [:]
        guard transaction.productType == .consumable, transaction.revocationDate == nil, transaction.purchasedQuantity == 1 else {
            failure(request, code: PurchaseFailure.unverified.rawValue)
            return
        }
        processing.insert(transaction.id)
        defer { processing.remove(transaction.id) }
        let purchase = VerifiedCoinPurchase(transactionID: String(transaction.id), originalTransactionID: String(transaction.originalID), productID: transaction.productID, packageID: package.packageID, coins: package.coins, signedTransaction: verification.jwsRepresentation, appAccountToken: Self.accountToken(userID: account.userID, namespace: namespace))
        do {
            let receipt = try await delivery.deliver(purchase, account: account)
            guard receipt.validates(purchase, account: account) else { throw PurchaseFailure.deliveryPending }
            // Finish only after the selected delivery implementation confirms the balance write.
            await transaction.finish()
            delivered.insert(transaction.id)
            requests.removeValue(forKey: transaction.productID)
            guard self.account?.userID == account.userID else { return }
            var result = Self.correlation(request)
            result.merge(["success": true, "status": "success", "verified": true, "credited": true, "isRecovery": request.isEmpty, "transactionId": purchase.transactionID, "userId": receipt.userID, "productId": receipt.productID, "packageId": package.packageID, "coinCount": package.coins, "balance": receipt.balance]) { _, new in new }
            emit("APP_PURCHASE_SUCCESS", result)
        } catch {
            requests.removeValue(forKey: transaction.productID)
            guard self.account?.userID == account.userID else { return }
            var result = Self.correlation(request)
            result.merge(["userId": account.userID, "transactionId": purchase.transactionID, "productId": package.productID, "packageId": package.packageID]) { _, new in new }
            failure(result, status: "delivery_pending", code: PurchaseFailure.deliveryPending.rawValue)
            // Leave the transaction unfinished so it can be retried on the next session update.
        }
    }

    func restore(_ data: [String: Any]) async {
        await recoverUnfinished()
        var result = Self.correlation(data)
        result.merge(["success": false, "status": "failed", "code": "consumables_not_restorable"]) { _, new in new }
        emit("APP_PURCHASE_RESTORE_FAILED", result)
    }

    private func failure(_ data: [String: Any], status: String = "failed", code: String) {
        var result = Self.correlation(data)
        result.merge(["success": false, "status": status, "code": code]) { _, new in new }
        emit("APP_PURCHASE_FAILED", result)
    }

    private static func identifier(_ value: Any?) -> String {
        if let value = value as? String { return String(value.prefix(1024)) }
        if let value = value as? NSNumber { return value.stringValue }
        return ""
    }

    private static func correlation(_ data: [String: Any]) -> [String: Any] {
        var result: [String: Any] = [:]
        for key in ["requestId", "userId", "productId", "packageId", "transactionId"] {
            let value = identifier(data[key])
            if !value.isEmpty { result[key] = value }
        }
        return result
    }

    deinit { updates?.cancel() }
}

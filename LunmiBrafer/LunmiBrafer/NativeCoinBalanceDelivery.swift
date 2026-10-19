import Foundation
import CoreFoundation

/// Uses the existing balance APIs after StoreKit's local signature verification.
/// The local ledger prevents ordinary replay on this installation; the legacy API
/// cannot provide atomic transaction-level deduplication across multiple devices.
@MainActor final class NativeCoinBalanceDelivery: PurchaseDelivering {
    typealias Request = (String, [String: Any], PurchaseAccount) async throws -> Any
    private struct Entry: Codable {
        let userID: String
        let productID: String
        let coins: Int
        var before: Double
        var target: Double
        var attempted: Bool
        var credited: Bool
        var recorded: Bool
    }
    let isConfigured = true
    private let bundleID: String
    private let ledgerURL: URL
    private let request: Request
    private var entries: [String: Entry] = [:]
    private var ledgerReadable = true
    private var activeAccounts = Set<String>()

    init(bundleID: String, ledgerURL: URL? = nil, permittedHTTPOrigin: URL? = nil, request: Request? = nil) {
        self.bundleID = bundleID
        self.ledgerURL = ledgerURL ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("LunmiPurchases/transactions.json")
        self.request = request ?? { endpoint, body, account in
            try await BalanceAPI.request(endpoint: endpoint, body: body, account: account, permittedHTTPOrigin: permittedHTTPOrigin)
        }
        if FileManager.default.fileExists(atPath: self.ledgerURL.path) {
            do { entries = try JSONDecoder().decode([String: Entry].self, from: Data(contentsOf: self.ledgerURL)) }
            catch { ledgerReadable = false }
        }
    }

    func prepare(account: PurchaseAccount) async throws {
        guard ledgerReadable else { throw PurchaseFailure.deliveryPending }
        guard !bundleID.isEmpty, account.apiBaseURL != nil else { throw PurchaseFailure.apiNotConfigured }
        try persist(entries)
        _ = try await readBalance(account)
    }

    func deliver(_ purchase: VerifiedCoinPurchase, account: PurchaseAccount) async throws -> PurchaseDeliveryReceipt {
        guard ledgerReadable, !activeAccounts.contains(account.userID) else { throw PurchaseFailure.deliveryPending }
        activeAccounts.insert(account.userID)
        defer { activeAccounts.remove(account.userID) }
        let key = bundleID + ":" + purchase.transactionID
        var entry: Entry
        if let previous = entries[key] {
            guard previous.userID == account.userID, previous.productID == purchase.productID, previous.coins == purchase.coins else { throw PurchaseFailure.accountMismatch }
            entry = previous
        } else {
            let balance = try await readBalance(account)
            let target = balance + Double(purchase.coins)
            guard target.isFinite, target <= 9_007_199_254_740_991 else { throw PurchaseFailure.deliveryPending }
            entry = Entry(userID: account.userID, productID: purchase.productID, coins: purchase.coins, before: balance, target: target, attempted: false, credited: false, recorded: false)
            try save(entry, key: key)
        }
        if !entry.credited {
            let current = try await readBalance(account)
            if !entry.attempted {
                entry.before = current
                entry.target = current + Double(purchase.coins)
                guard entry.target.isFinite, entry.target <= 9_007_199_254_740_991 else { throw PurchaseFailure.deliveryPending }
                entry.attempted = true
                try save(entry, key: key)
                _ = try await request("/api/updateUserBalance", ["balance": entry.target, "bundleId": bundleID], account)
                entry.credited = true
            } else if current == entry.target {
                // A previous write may have succeeded before its HTTP response was lost.
                entry.credited = true
            } else if current == entry.before {
                _ = try await request("/api/updateUserBalance", ["balance": entry.target, "bundleId": bundleID], account)
                entry.credited = true
            } else {
                // An unrelated balance change makes retrying an absolute write ambiguous.
                // Preserve the unfinished transaction instead of overwriting those changes.
                throw PurchaseFailure.deliveryPending
            }
            try save(entry, key: key)
        }
        if !entry.recorded {
            do {
                _ = try await request("/api/addUserBalanceRecord", ["balanceVal": entry.coins, "balanceCurrent": entry.target, "changeType": 1, "balanceContent": "\(entry.coins) Lantern Coins · Apple \(purchase.transactionID)", "bundleId": bundleID, "userId": account.userID], account)
                entry.recorded = true
                try save(entry, key: key)
            } catch {
                // Coins have already been credited. A history failure must not trigger
                // a second balance increase or report that the payment itself failed.
            }
        }
        return PurchaseDeliveryReceipt(transactionID: purchase.transactionID, userID: account.userID, productID: purchase.productID, creditedCoins: purchase.coins, balance: entry.target)
    }

    private func readBalance(_ account: PurchaseAccount) async throws -> Double {
        let data = try await request("/api/selectUserBalance", ["bundleId": bundleID], account)
        let dictionary = data as? [String: Any]
        let raw = dictionary?["userBalance"] ?? dictionary?["balance"] ?? data
        let balance: Double?
        if let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() { balance = number.doubleValue }
        else if let text = raw as? String { balance = Double(text) }
        else { balance = nil }
        guard let balance, balance.isFinite, balance >= 0 else { throw PurchaseFailure.apiUnavailable }
        return balance
    }

    private func save(_ entry: Entry, key: String) throws {
        var updated = entries
        updated[key] = entry
        try persist(updated)
        entries = updated
    }

    private func persist(_ entries: [String: Entry]) throws {
        try FileManager.default.createDirectory(at: ledgerURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(entries).write(to: ledgerURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
}

private enum BalanceAPI {
    // Do not forward the authentication header to a redirect target.
    private final class RedirectPolicy: NSObject, URLSessionTaskDelegate {
        func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    }
    private static let session = URLSession(configuration: .ephemeral, delegate: RedirectPolicy(), delegateQueue: nil)

    static func request(endpoint: String, body: [String: Any], account: PurchaseAccount, permittedHTTPOrigin: URL?) async throws -> Any {
        guard let base = account.apiBaseURL, NativeConfiguration.isAllowedAPIURL(base, permittedHTTPOrigin: permittedHTTPOrigin), !account.accessToken.isEmpty,
              let url = URL(string: base.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + endpoint) else { throw PurchaseFailure.apiNotConfigured }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(account.accessToken, forHTTPHeaderField: "token")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
              let envelope = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw PurchaseFailure.apiUnavailable }
        let code = (envelope["code"] as? NSNumber)?.intValue ?? Int(envelope["code"] as? String ?? "")
        guard code == 200000 else { throw PurchaseFailure.apiUnavailable }
        return envelope["data"] ?? NSNull()
    }
}

import Foundation

struct PurchaseAccount: Equatable {
    let userID: String
    let accessToken: String
    var apiBaseURL: URL? = nil
}

struct VerifiedCoinPurchase {
    let transactionID: String
    let originalTransactionID: String
    let productID: String
    let packageID: String
    let coins: Int
    let signedTransaction: String
    let appAccountToken: UUID
}

struct PurchaseDeliveryReceipt {
    let transactionID: String
    let userID: String
    let productID: String
    let creditedCoins: Int
    let balance: Double

    func validates(_ purchase: VerifiedCoinPurchase, account: PurchaseAccount) -> Bool {
        transactionID == purchase.transactionID && userID == account.userID && productID == purchase.productID
            && creditedCoins == purchase.coins && balance.isFinite && balance >= 0
    }
}

@MainActor protocol PurchaseDelivering {
    var isConfigured: Bool { get }
    func prepare(account: PurchaseAccount) async throws
    func deliver(_ purchase: VerifiedCoinPurchase, account: PurchaseAccount) async throws -> PurchaseDeliveryReceipt
}

extension PurchaseDelivering {
    func prepare(account: PurchaseAccount) async throws {}
}

struct UnconfiguredPurchaseDelivery: PurchaseDelivering {
    var isConfigured: Bool { false }
    func deliver(_ purchase: VerifiedCoinPurchase, account: PurchaseAccount) async throws -> PurchaseDeliveryReceipt {
        throw PurchaseFailure.notConfigured
    }
}

enum PurchaseFailure: String, LocalizedError {
    case notConfigured = "delivery_not_configured"
    case invalidProduct = "invalid_product"
    case unavailable = "store_unavailable"
    case notLoggedIn = "not_logged_in"
    case busy = "purchase_busy"
    case unverified = "unverified_transaction"
    case accountMismatch = "account_mismatch"
    case deliveryPending = "delivery_pending"
    case apiNotConfigured = "api_not_configured"
    case apiUnavailable = "api_unavailable"

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "Purchases are unavailable until transaction verification is configured."
        case .invalidProduct: return "This coin package is unavailable."
        case .unavailable: return "The App Store is unavailable. Please try again."
        case .notLoggedIn: return "Please log in to buy coins."
        case .busy: return "Another purchase is in progress."
        case .unverified: return "Apple transaction verification failed."
        case .accountMismatch: return "The purchase belongs to another account."
        case .deliveryPending: return "Your payment is awaiting coin delivery. Please do not purchase again."
        case .apiNotConfigured: return "The account service is not configured."
        case .apiUnavailable: return "Unable to update your balance. Please try again."
        }
    }
}

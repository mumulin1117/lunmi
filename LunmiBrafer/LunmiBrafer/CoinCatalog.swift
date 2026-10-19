import Foundation

struct CoinPackage: Decodable {
    let packageID: String
    let productID: String
    let coins: Int
    let priceAmount: Decimal
    enum CodingKeys: String, CodingKey {
        case packageID = "package_id", productID = "product_id", coins = "coin_count", priceAmount = "price_amount"
    }
}

struct CoinCatalog: Decodable {
    let packages: [CoinPackage]
    enum CodingKeys: String, CodingKey { case packages = "coin_packages" }

    static func load(bundle: Bundle = .main) throws -> CoinCatalog {
        guard let web = bundle.url(forResource: "Web", withExtension: nil) else { throw PurchaseFailure.invalidProduct }
        let catalog = try JSONDecoder().decode(CoinCatalog.self, from: Data(contentsOf: web.appendingPathComponent("static/config/coin-packages.json")))
        guard !catalog.packages.isEmpty,
              Set(catalog.packages.map(\.productID)).count == catalog.packages.count,
              Set(catalog.packages.map(\.packageID)).count == catalog.packages.count,
              catalog.packages.allSatisfy({ !$0.productID.isEmpty && $0.coins > 0 && $0.priceAmount > 0 }) else { throw PurchaseFailure.invalidProduct }
        return catalog
    }

    func package(productID: String) -> CoinPackage? { packages.first { $0.productID == productID } }
}

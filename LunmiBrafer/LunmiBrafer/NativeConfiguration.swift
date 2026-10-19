import Foundation

struct NativeConfiguration {
    // Keep these production settings in code. The build script also reads this
    // URL literal to generate the matching, domain-scoped HTTP exception.
    let apiBaseURL = "http://0sc8fcvanc9gf8ckb40o.shop/api"
    let liveWebSocketURL = ""
    let apiBundleID = "6101415"

    var permittedHTTPOrigin: URL? {
        guard let url = URL(string: apiBaseURL), url.scheme == "http", url.host != nil,
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil else { return nil }
        return url
    }

    static func isAllowedAPIURL(_ url: URL, permittedHTTPOrigin: URL? = nil) -> Bool {
        guard url.host != nil, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil else { return false }
        if url.scheme == "https" { return true }
        return url.scheme == "http" && permittedHTTPOrigin?.scheme == "http"
            && url.host == permittedHTTPOrigin?.host && url.port == permittedHTTPOrigin?.port
    }

    var javascriptValues: [String: String] {
        var result = [
            "VITE_API_BASE_URL": apiBaseURL,
            "VITE_BUNDLE_ID": apiBundleID
        ]
        if !liveWebSocketURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            result["VITE_LIVE_WS_URL"] = liveWebSocketURL
        }
        result["APP_DEVICE_LANGUAGE"] = NativeAppLanguage.deviceLanguage()
        result["APP_LANGUAGE_PREFERENCE"] = NativeAppLanguage.savedLanguage() ?? ""
        result["APP_LANGUAGE_BRIDGE_VERSION"] = "1"
        return result
    }
}

enum NativeAppLanguage {
    static let preferenceKey = "lunmi.app_language"
    static let didChange = Notification.Name("LunmiAppLanguageDidChange")

    static func deviceLanguage(preferences: [String] = Locale.preferredLanguages) -> String {
        let primary = preferences.first?.lowercased().split(whereSeparator: { $0 == "-" || $0 == "_" }).first.map(String.init)
        return primary == "ja" ? "ja" : "en"
    }

    static func savedLanguage(defaults: UserDefaults = .standard) -> String? {
        guard let code = defaults.string(forKey: preferenceKey), ["en", "ja"].contains(code) else { return nil }
        return code
    }

    static func current(defaults: UserDefaults = .standard, preferences: [String] = Locale.preferredLanguages) -> String {
        savedLanguage(defaults: defaults) ?? deviceLanguage(preferences: preferences)
    }

    @discardableResult static func save(_ code: String, defaults: UserDefaults = .standard) -> Bool {
        guard ["en", "ja"].contains(code) else { return false }
        defaults.set(code, forKey: preferenceKey)
        NotificationCenter.default.post(name: didChange, object: nil)
        return true
    }

    static func text(_ key: String, defaults: UserDefaults = .standard, bundle: Bundle = .main) -> String {
        let code = current(defaults: defaults)
        guard let path = bundle.path(forResource: code, ofType: "lproj"), let localized = Bundle(path: path) else { return key }
        return localized.localizedString(forKey: key, value: key, table: nil)
    }
}

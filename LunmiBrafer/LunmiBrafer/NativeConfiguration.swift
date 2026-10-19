import Foundation

struct NativeConfiguration {
    let values: [String: Any]

    init(bundle: Bundle = .main) {
        if let url = bundle.url(forResource: "Configuration", withExtension: "plist"),
           let data = try? Data(contentsOf: url),
           let dictionary = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] {
            values = dictionary
        } else {
            values = [:]
        }
    }

    var apiBaseURL: String {
        return values["APIBaseURL"] as? String ?? ""
    }

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
        let keys = [
            "APIBaseURL": "VITE_API_BASE_URL",
            "LiveWebSocketURL": "VITE_LIVE_WS_URL",
            "APIBundleID": "VITE_BUNDLE_ID"
        ]
        var result = keys.reduce(into: [String: String]()) { result, pair in
            let configured = pair.key == "APIBaseURL" ? apiBaseURL : values[pair.key] as? String
            if let value = configured, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                result[pair.value] = value
            }
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

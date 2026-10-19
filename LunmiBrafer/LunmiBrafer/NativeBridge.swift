import UIKit
import WebKit
import AVFoundation
import Photos
import Contacts
import ContactsUI
import CoreLocation
import LocalAuthentication

enum BridgeOrigin {
    static func isTrusted(_ url: URL?) -> Bool {
        guard let url, BundledWebContent.contains(url) else { return false }
        return url.path == "/" || url.path == "/index.html"
    }
}

@MainActor final class NativeBridge: NSObject, WKScriptMessageHandler, @preconcurrency CLLocationManagerDelegate, @preconcurrency CNContactPickerDelegate {
    private weak var webView: WKWebView?
    private weak var presenter: UIViewController?
    private let configuration: NativeConfiguration
    private let location = CLLocationManager()
    private var locationCompletion: ((String) -> Void)?
    private var contactsRequest: [String: Any]?
    private var biometricContext: LAContext?
    private lazy var purchases = CoinPurchaseManager(catalog: try? CoinCatalog.load(), namespace: configuration.values["APIBundleID"] as? String ?? "", delivery: NativeCoinBalanceDelivery(bundleID: configuration.values["APIBundleID"] as? String ?? "", permittedHTTPOrigin: configuration.permittedHTTPOrigin), permittedHTTPOrigin: configuration.permittedHTTPOrigin) { [weak self] type, data in
        self?.send(type, data: data)
    }
    private let legacyTypes = [
        "performHaptic": "APP_HAPTIC_REQUEST", "shareActivity": "APP_SHARE_ACTIVITY_REQUEST",
        "requestContacts": "APP_CONTACTS_PERMISSION_REQUEST", "requestPhotoLibraryPermission": "APP_PHOTO_LIBRARY_PERMISSION_REQUEST",
        "requestLocationPermission": "APP_LOCATION_PERMISSION_REQUEST", "requestFaceIDPermission": "APP_FACE_ID_PERMISSION_REQUEST",
        "requestCameraPermission": "APP_CAMERA_PERMISSION_REQUEST", "requestMicrophonePermission": "APP_MICROPHONE_PERMISSION_REQUEST",
        "SawmeIAP": "APP_PURCHASE_REQUEST", "CommonTemplateSafeArea": "APP_SAFE_AREA_REQUEST"
    ]

    init(webView: WKWebView, presenter: UIViewController, configuration: NativeConfiguration) {
        self.webView = webView
        self.presenter = presenter
        self.configuration = configuration
        super.init()
        location.delegate = self
    }

    func register() {
        _ = purchases
        guard let controller = webView?.configuration.userContentController else { return }
        for name in ["CommonTemplateBridge"] + Array(legacyTypes.keys) { controller.add(self, name: name) }
    }

    func unregister() {
        for name in ["CommonTemplateBridge"] + Array(legacyTypes.keys) { webView?.configuration.userContentController.removeScriptMessageHandler(forName: name) }
        biometricContext?.invalidate()
    }

    func isTrusted(_ url: URL?) -> Bool { BridgeOrigin.isTrusted(url) }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, isTrusted(message.frameInfo.request.url), isTrusted(webView?.url),
              let payload = message.body as? [String: Any] else { return }
        let type = message.name == "CommonTemplateBridge" ? payload["type"] as? String : legacyTypes[message.name]
        let data = payload["data"] as? [String: Any] ?? payload
        guard let type else { return }
        switch type {
        case "APP_LANGUAGE_STATE_REQUEST": sendLanguage()
        case "APP_LANGUAGE_SET_REQUEST":
            guard let requestID = data["requestId"] as? String, !requestID.isEmpty, requestID.count <= 128 else { return }
            let code = data["code"] as? String ?? ""
            let saved = NativeAppLanguage.save(code)
            send("APP_LANGUAGE_SET_RESULT", data: ["requestId": requestID, "success": saved, "code": saved ? code : ""])
            if saved { sendLanguage() }
        case "APP_SAFE_AREA_REQUEST": sendSafeArea()
        case "APP_HAPTIC_REQUEST": haptic(data["style"] as? String ?? "light")
        case "APP_SHARE_ACTIVITY_REQUEST": share(data)
        case "APP_PRODUCTS_REQUEST": Task { await purchases.loadProducts(data) }
        case "APP_PURCHASE_SESSION_UPDATE": purchases.updateSession(data)
        case "APP_PURCHASE_REQUEST":
            Task {
                if data["operation"] as? String == "restore" { await purchases.restore(data) }
                else { await purchases.purchase(data) }
            }
        case "APP_PURCHASE_RESTORE_REQUEST": Task { await purchases.restore(data) }
        case "APP_CAMERA_PERMISSION_REQUEST", "APP_MICROPHONE_PERMISSION_REQUEST", "APP_PHOTO_LIBRARY_PERMISSION_REQUEST", "APP_LOCATION_PERMISSION_REQUEST", "APP_CONTACTS_PERMISSION_REQUEST", "APP_FACE_ID_PERMISSION_REQUEST":
            permission(type, data: data)
        default: break
        }
    }

    private func correlation(_ data: [String: Any]) -> [String: Any] {
        var result: [String: Any] = [:]
        for key in ["requestId", "productId", "packageId", "userId"] {
            if let value = data[key] as? String, value.count <= 1024 { result[key] = value }
            else if let value = data[key] as? NSNumber { result[key] = value }
        }
        return result
    }

    private func send(_ type: String, data: [String: Any]) {
        guard let webView, isTrusted(webView.url) else { return }
        // WebKit serializes arguments; user content is never interpolated into JavaScript.
        webView.callAsyncJavaScript("window.CommonTemplateH5Bridge?.receive(message)", arguments: ["message": ["type": type, "data": data]], in: nil, in: .page, completionHandler: nil)
    }

    func sendSafeArea() {
        guard let insets = presenter?.view.safeAreaInsets else { return }
        send("APP_SAFE_AREA_UPDATE", data: ["top": Double(insets.top), "bottom": Double(insets.bottom)])
    }

    func sendLanguage() {
        send("APP_LANGUAGE_STATE_UPDATE", data: ["deviceLanguage": NativeAppLanguage.deviceLanguage(), "preferredLanguage": NativeAppLanguage.savedLanguage() ?? ""])
    }

    private func haptic(_ style: String) {
        if style == "selection" { UISelectionFeedbackGenerator().selectionChanged(); return }
        if ["success", "warning", "error"].contains(style) {
            UINotificationFeedbackGenerator().notificationOccurred(style == "success" ? .success : style == "warning" ? .warning : .error)
        } else { UIImpactFeedbackGenerator(style: style == "heavy" ? .heavy : style == "medium" ? .medium : .light).impactOccurred() }
    }

    private func share(_ data: [String: Any]) {
        guard let presenter, presenter.presentedViewController == nil, let text = data["text"] as? String, !text.isEmpty, text.count <= 20_000 else { return }
        let controller = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let subject = data["subject"] as? String { controller.setValue(String(subject.prefix(200)), forKey: "subject") }
        controller.popoverPresentationController?.sourceView = presenter.view
        controller.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
        presenter.present(controller, animated: true)
    }

    private func permissionResult(_ requestType: String, data: [String: Any], status: String, contacts: [[String: Any]]? = nil) {
        var result = correlation(data)
        let granted = ["authorized", "authorized_when_in_use", "authorized_always", "limited"].contains(status)
        result["success"] = granted
        result["granted"] = granted
        result["permission_status"] = status
        if let contacts { result["contacts"] = contacts }
        send(requestType.replacingOccurrences(of: "_REQUEST", with: "_RESULT"), data: result)
    }

    private func permission(_ type: String, data: [String: Any]) {
        if data["openSettings"] as? Bool == true {
            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            permissionResult(type, data: data, status: "not_determined")
            return
        }
        switch type {
        case "APP_CAMERA_PERMISSION_REQUEST", "APP_MICROPHONE_PERMISSION_REQUEST":
            let media: AVMediaType = type == "APP_CAMERA_PERMISSION_REQUEST" ? .video : .audio
            if data["checkOnly"] as? Bool == true {
                permissionResult(type, data: data, status: AVMediaTypeStatus(AVCaptureDevice.authorizationStatus(for: media)))
                return
            }
            authorizeMedia([media]) { [weak self] allowed in
                let status = AVMediaTypeStatus(AVCaptureDevice.authorizationStatus(for: media))
                self?.permissionResult(type, data: data, status: allowed ? "authorized" : status)
            }
        case "APP_PHOTO_LIBRARY_PERMISSION_REQUEST":
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { [weak self] status in
                DispatchQueue.main.async {
                    let text: String
                    switch status { case .authorized: text = "authorized"; case .limited: text = "limited"; case .denied: text = "denied"; case .restricted: text = "restricted"; default: text = "not_determined" }
                    self?.permissionResult(type, data: data, status: text)
                }
            }
        case "APP_LOCATION_PERMISSION_REQUEST":
            guard CLLocationManager.locationServicesEnabled() else { permissionResult(type, data: data, status: "unavailable"); return }
            if location.authorizationStatus != .notDetermined { permissionResult(type, data: data, status: locationStatus()); return }
            guard locationCompletion == nil else { permissionResult(type, data: data, status: "unavailable"); return }
            locationCompletion = { [weak self] status in self?.permissionResult(type, data: data, status: status) }
            location.requestWhenInUseAuthorization()
        case "APP_CONTACTS_PERMISSION_REQUEST":
            if data["fields"] != nil { pickContacts(data); return }
            CNContactStore().requestAccess(for: .contacts) { [weak self] allowed, _ in
                DispatchQueue.main.async { self?.permissionResult(type, data: data, status: allowed ? "authorized" : "denied") }
            }
        case "APP_FACE_ID_PERMISSION_REQUEST":
            let context = LAContext()
            guard biometricContext == nil, context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else { permissionResult(type, data: data, status: "unavailable"); return }
            biometricContext = context
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: NativeAppLanguage.text("Verify your identity for Lunmi.")) { [weak self] allowed, _ in
                DispatchQueue.main.async { self?.biometricContext = nil; self?.permissionResult(type, data: data, status: allowed ? "authorized" : "denied") }
            }
        default: break
        }
    }

    func authorizeMedia(_ media: [AVMediaType], completion: @escaping (Bool) -> Void) {
        guard let first = media.first else { completion(true); return }
        let next: @Sendable (Bool) -> Void = { [weak self] allowed in
            DispatchQueue.main.async {
                guard allowed else { completion(false); return }
                self?.authorizeMedia(Array(media.dropFirst()), completion: completion)
            }
        }
        switch AVCaptureDevice.authorizationStatus(for: first) {
        case .authorized: next(true)
        case .notDetermined: AVCaptureDevice.requestAccess(for: first, completionHandler: next)
        default: next(false)
        }
    }

    private func locationStatus() -> String {
        switch location.authorizationStatus {
        case .authorizedAlways: return "authorized_always"
        case .authorizedWhenInUse: return "authorized_when_in_use"
        case .denied: return "denied"
        case .restricted: return "restricted"
        default: return "not_determined"
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard manager.authorizationStatus != .notDetermined else { return }
        let callback = locationCompletion
        locationCompletion = nil
        callback?(locationStatus())
    }

    private func pickContacts(_ data: [String: Any]) {
        guard contactsRequest == nil, let presenter, presenter.presentedViewController == nil else {
            permissionResult("APP_CONTACTS_PERMISSION_REQUEST", data: data, status: "unavailable"); return
        }
        contactsRequest = data
        let picker = CNContactPickerViewController()
        picker.delegate = self
        picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        presenter.present(picker, animated: true)
    }

    func contactPicker(_ picker: CNContactPickerViewController, didSelect contacts: [CNContact]) {
        guard let data = contactsRequest else { return }
        contactsRequest = nil
        let maximum = min(500, max(1, data["maximumContacts"] as? Int ?? 500))
        let selected: [[String: Any]] = contacts.prefix(maximum).map {
            ["identifier": $0.identifier, "givenName": $0.givenName, "familyName": $0.familyName, "phoneNumbers": $0.phoneNumbers.map { $0.value.stringValue }]
        }
        permissionResult("APP_CONTACTS_PERMISSION_REQUEST", data: data, status: "limited", contacts: selected)
    }

    func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        guard let data = contactsRequest else { return }
        contactsRequest = nil
        permissionResult("APP_CONTACTS_PERMISSION_REQUEST", data: data, status: "denied", contacts: [])
    }

}

private func AVMediaTypeStatus(_ status: AVAuthorizationStatus) -> String {
    switch status { case .authorized: return "authorized"; case .denied: return "denied"; case .restricted: return "restricted"; default: return "not_determined" }
}

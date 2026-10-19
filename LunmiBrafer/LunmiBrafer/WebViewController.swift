import UIKit
import WebKit
import SafariServices
import CryptoKit
import AVFoundation

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private var bridge: NativeBridge!
    private let contentHandler = BundledWebContentHandler(root: Bundle.main.bundleURL.appendingPathComponent("Web", isDirectory: true))
    private let spinner = UIActivityIndicatorView(style: .large)
    private let errorLabel = UILabel()
    private let retryButton = UIButton(type: .system)
    private let configuration = NativeConfiguration()

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 23 / 255, green: 18 / 255, blue: 48 / 255, alpha: 1)
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.setURLSchemeHandler(contentHandler, forURLScheme: BundledWebContent.scheme)
        let values = (try? JSONSerialization.data(withJSONObject: configuration.javascriptValues)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        config.userContentController.addUserScript(WKUserScript(source: "Object.defineProperty(window, 'LunmiNativeConfiguration', {value: Object.freeze(\(values)), writable: false});", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([webView.topAnchor.constraint(equalTo: view.topAnchor), webView.bottomAnchor.constraint(equalTo: view.bottomAnchor), webView.leadingAnchor.constraint(equalTo: view.leadingAnchor), webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        bridge = NativeBridge(webView: webView, presenter: self, configuration: configuration)
        bridge.register()
        spinner.color = .white
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)
        NSLayoutConstraint.activate([spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor), spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)])
        errorLabel.textColor = .white
        errorLabel.numberOfLines = 0
        errorLabel.textAlignment = .center
        refreshNativeLanguage()
        NotificationCenter.default.addObserver(self, selector: #selector(refreshNativeLanguage), name: NativeAppLanguage.didChange, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appBecameActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        retryButton.addTarget(self, action: #selector(loadApp), for: .touchUpInside)
        let failure = UIStackView(arrangedSubviews: [errorLabel, retryButton])
        failure.axis = .vertical
        failure.spacing = 18
        failure.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(failure)
        NSLayoutConstraint.activate([failure.centerYAnchor.constraint(equalTo: view.centerYAnchor), failure.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32), failure.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32)])
        loadApp()
    }

    @objc private func loadApp() {
        errorLabel.isHidden = true
        retryButton.isHidden = true
        spinner.startAnimating()
        guard let root = Bundle.main.url(forResource: "Web", withExtension: nil),
              let manifestURL = Bundle.main.url(forResource: "WebBundleManifest", withExtension: "json"),
              let manifestData = try? Data(contentsOf: manifestURL),
              let manifest = try? JSONSerialization.jsonObject(with: manifestData) as? [String: Any],
              let entry = try? Data(contentsOf: root.appendingPathComponent("index.html")),
              SHA256.hash(data: entry).map({ String(format: "%02x", $0) }).joined() == manifest["entrySHA256"] as? String else { showError(); return }
        webView.load(URLRequest(url: BundledWebContent.entryURL))
    }

    private func showError() {
        spinner.stopAnimating()
        refreshNativeLanguage()
        errorLabel.isHidden = false
        retryButton.isHidden = false
    }

    @objc private func refreshNativeLanguage() {
        retryButton.setTitle(NativeAppLanguage.text("Retry"), for: .normal)
        errorLabel.text = NativeAppLanguage.text("Lunmi could not be loaded. Please try again.")
    }

    @objc private func appBecameActive() {
        refreshNativeLanguage()
        bridge?.sendLanguage()
    }

    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); bridge?.sendSafeArea() }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); bridge?.sendSafeArea() }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { spinner.stopAnimating(); bridge.sendSafeArea(); bridge.sendLanguage() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { if (error as NSError).code != NSURLErrorCancelled { showError() } }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showError() }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { loadApp() }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if bridge.isTrusted(url) { decisionHandler(.allow); return }
        decisionHandler(.cancel)
        guard navigationAction.targetFrame?.isMainFrame != false else { return }
        if url.scheme == "https" { present(SFSafariViewController(url: url), animated: true) }
        else if url.scheme == "mailto" { UIApplication.shared.open(url) }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme == "https" { present(SFSafariViewController(url: url), animated: true) }
        return nil
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        guard frame.isMainFrame, bridge.isTrusted(frame.request.url), bridge.isTrusted(webView.url) else { decisionHandler(.deny); return }
        let kinds: [AVMediaType] = type == .camera ? [.video] : type == .microphone ? [.audio] : [.video, .audio]
        bridge.authorizeMedia(kinds) { allowed in decisionHandler(allowed ? .grant : .deny) }
    }

    deinit { NotificationCenter.default.removeObserver(self) }
}

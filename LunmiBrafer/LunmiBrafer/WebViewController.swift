import UIKit
import WebKit
import SafariServices
import AVFoundation

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private var bridge: NativeBridge!
    private let contentHandler = BundledWebContentHandler()
    private let preparationQueue = DispatchQueue(label: "com.lunmi.content.prepare", qos: .userInitiated, autoreleaseFrequency: .workItem)
    private var loadID = UUID()
    private var navigationFinished = false
    private var contentReady = false
    private var awaitingContent = false
    private var loadingTimeout: DispatchWorkItem?
    private var activeNavigation: WKNavigation?
    private let launchCover = UIView()
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
        // Keep the launch artwork behind the transparent WebView even after loading.
        addLaunchArtwork(to: view)
        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.underPageBackgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([webView.topAnchor.constraint(equalTo: view.topAnchor), webView.bottomAnchor.constraint(equalTo: view.bottomAnchor), webView.leadingAnchor.constraint(equalTo: view.leadingAnchor), webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        bridge = NativeBridge(webView: webView, presenter: self, configuration: configuration)
        bridge.onContentReady = { [weak self] launchID in
            guard let self, self.awaitingContent, launchID == self.loadID.uuidString else { return }
            self.contentReady = true
            self.revealContentIfReady()
        }
        bridge.register()
        launchCover.backgroundColor = view.backgroundColor
        launchCover.accessibilityViewIsModal = true
        launchCover.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(launchCover)
        pinToEdges(launchCover, of: view)
        addLaunchArtwork(to: launchCover)
        spinner.color = .white
        spinner.isAccessibilityElement = true
        spinner.translatesAutoresizingMaskIntoConstraints = false
        launchCover.addSubview(spinner)
        NSLayoutConstraint.activate([
            spinner.centerXAnchor.constraint(equalTo: launchCover.centerXAnchor),
            NSLayoutConstraint(item: spinner, attribute: .centerY, relatedBy: .equal, toItem: launchCover, attribute: .bottom, multiplier: 0.58, constant: 0)
        ])
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
        launchCover.addSubview(failure)
        NSLayoutConstraint.activate([failure.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 24), failure.leadingAnchor.constraint(equalTo: launchCover.leadingAnchor, constant: 32), failure.trailingAnchor.constraint(equalTo: launchCover.trailingAnchor, constant: -32)])
        loadApp()
    }

    private func pinToEdges(_ child: UIView, of parent: UIView) {
        NSLayoutConstraint.activate([
            child.topAnchor.constraint(equalTo: parent.topAnchor),
            child.bottomAnchor.constraint(equalTo: parent.bottomAnchor),
            child.leadingAnchor.constraint(equalTo: parent.leadingAnchor),
            child.trailingAnchor.constraint(equalTo: parent.trailingAnchor)
        ])
    }

    private func addLaunchArtwork(to container: UIView) {
        let image = UIImageView(image: UIImage(named: "LaunchBackground"))
        // Match LaunchScreen.storyboard exactly, including full-screen aspect fill.
        image.contentMode = .scaleAspectFill
        image.clipsToBounds = true
        image.isAccessibilityElement = false
        image.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(image)
        pinToEdges(image, of: container)
    }

    @objc private func loadApp() {
        loadingTimeout?.cancel()
        awaitingContent = true
        navigationFinished = false
        contentReady = false
        launchCover.layer.removeAllAnimations()
        launchCover.alpha = 1
        launchCover.isHidden = false
        webView.isUserInteractionEnabled = false
        webView.accessibilityElementsHidden = true
        activeNavigation = nil
        webView.stopLoading()
        errorLabel.isHidden = true
        retryButton.isHidden = true
        spinner.startAnimating()
        let requestID = UUID()
        loadID = requestID
        NSLog("Lunmi launch cover active; preparing bundled content.")
        preparationQueue.async { [weak self] in
            let result = Result { try LunimcenterArchive.prepare() }
            DispatchQueue.main.async {
                guard let self, self.loadID == requestID else { return }
                switch result {
                case .success(let root):
                    self.contentHandler.root = root
                    self.bridge.preparePurchases(root: root)
                    var values = self.configuration.javascriptValues
                    values["APP_LAUNCH_ID"] = requestID.uuidString
                    let json = (try? JSONSerialization.data(withJSONObject: values)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
                    // This controller owns the document-start scripts. Refresh the
                    // per-navigation ID so an old page cannot dismiss a retry cover.
                    let controller = self.webView.configuration.userContentController
                    controller.removeAllUserScripts()
                    controller.addUserScript(WKUserScript(source: "Object.defineProperty(window, 'LunmiNativeConfiguration', {value: Object.freeze(\(json)), writable: false});", injectionTime: .atDocumentStart, forMainFrameOnly: true))
                    let timeout = DispatchWorkItem { [weak self] in
                        guard let self, self.loadID == requestID, self.awaitingContent else { return }
                        self.showError()
                    }
                    self.loadingTimeout = timeout
                    DispatchQueue.main.asyncAfter(deadline: .now() + 45, execute: timeout)
                    self.activeNavigation = self.webView.load(URLRequest(url: BundledWebContent.entryURL))
                case .failure:
                    self.showError()
                }
            }
        }
    }

    private func showError() {
        awaitingContent = false
        loadingTimeout?.cancel()
        launchCover.layer.removeAllAnimations()
        launchCover.alpha = 1
        launchCover.isHidden = false
        webView.isUserInteractionEnabled = false
        webView.accessibilityElementsHidden = true
        spinner.stopAnimating()
        refreshNativeLanguage()
        errorLabel.isHidden = false
        retryButton.isHidden = false
        NSLog("Lunmi launch failed; displaying retry on launch artwork.")
    }

    private func revealContentIfReady() {
        guard awaitingContent, navigationFinished, contentReady else { return }
        awaitingContent = false
        loadingTimeout?.cancel()
        spinner.stopAnimating()
        let requestID = loadID
        let duration = UIAccessibility.isReduceMotionEnabled ? 0 : 0.28
        UIView.animate(withDuration: duration, delay: 0, options: [.beginFromCurrentState, .curveEaseOut]) {
            self.launchCover.alpha = 0
        } completion: { [weak self] finished in
            guard let self, finished, self.loadID == requestID, !self.awaitingContent else { return }
            self.launchCover.isHidden = true
            self.webView.isUserInteractionEnabled = true
            self.webView.accessibilityElementsHidden = false
            UIAccessibility.post(notification: .screenChanged, argument: nil)
            NSLog("Lunmi first screen ready; launch cover dismissed.")
        }
    }

    @objc private func refreshNativeLanguage() {
        spinner.accessibilityLabel = NativeAppLanguage.text("Loading…")
        retryButton.setTitle(NativeAppLanguage.text("Retry"), for: .normal)
        errorLabel.text = NativeAppLanguage.text("Lunmi could not be loaded. Please try again.")
    }

    @objc private func appBecameActive() {
        refreshNativeLanguage()
        bridge?.sendLanguage()
    }

    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); bridge?.sendSafeArea() }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); bridge?.sendSafeArea() }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let navigation, navigation === activeNavigation, awaitingContent else { return }
        navigationFinished = true
        bridge.sendSafeArea()
        bridge.sendLanguage()
        revealContentIfReady()
        NSLog("Lunmi lunimcenter page finished loading.")
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { handleNavigationFailure(navigation, error: error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { handleNavigationFailure(navigation, error: error) }
    private func handleNavigationFailure(_ navigation: WKNavigation?, error: Error) {
        guard let navigation, navigation === activeNavigation, (error as NSError).code != NSURLErrorCancelled else { return }
        showError()
    }
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

    deinit { loadingTimeout?.cancel(); NotificationCenter.default.removeObserver(self) }
}

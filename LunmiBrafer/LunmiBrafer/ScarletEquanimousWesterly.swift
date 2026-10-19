import UIKit
import WebKit
import SafariServices
import AVFoundation

final class ScarletEquanimousWesterly: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var annealingWavelet: WKWebView!
    private var thrumCrescent: CrescenticMerinoFern!
    private let itinerantFretless = AltocumulusMindful()
    private let hingeLacquer = DispatchQueue(label: LucentWonderment.willowSonority("cAoCmZ.altubnlmqiE.EcToNnntveXnytU.ipSrOeBpSaHrDek"), qos: .userInitiated, autoreleaseFrequency: .workItem)
    private var lenticularDamselflyLough = UUID()
    private var aquatintLunularPoised = false
    private var sandSoftnessDiatonic = false
    private var granularHaloChime = false
    private var alderRespiteOrganza: DispatchWorkItem?
    private var traverseBeechDiffusionDawn: WKNavigation?
    private let chambrayScroll = UIView()
    private let macramePine = UIActivityIndicatorView(style: .large)
    private let featherlightWarmth = UILabel()
    private let glazeConsonant = UIButton(type: .system)
    private let ariosoFootfall = PersistentPivotGlow()

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 23 / 255, green: 18 / 255, blue: 48 / 255, alpha: 1)
        let lakeFoldCurl = WKWebViewConfiguration()
        lakeFoldCurl.websiteDataStore = .default()
        lakeFoldCurl.allowsInlineMediaPlayback = true
        lakeFoldCurl.mediaTypesRequiringUserActionForPlayback = []
        lakeFoldCurl.setURLSchemeHandler(itinerantFretless, forURLScheme: BranchAltitudeFalcateDiffraction.composureTrace)
        // Keep the launch artwork behind the transparent WebView even after loading.
        fenAcaciaWhorlGauze(tarantelleFret: view)
        annealingWavelet = WKWebView(frame: .zero, configuration: lakeFoldCurl)
        annealingWavelet.translatesAutoresizingMaskIntoConstraints = false
        annealingWavelet.isOpaque = false
        annealingWavelet.backgroundColor = .clear
        annealingWavelet.scrollView.backgroundColor = .clear
        annealingWavelet.underPageBackgroundColor = .clear
        annealingWavelet.scrollView.contentInsetAdjustmentBehavior = .never
        annealingWavelet.scrollView.bounces = false
        annealingWavelet.navigationDelegate = self
        annealingWavelet.uiDelegate = self
        annealingWavelet.allowsBackForwardNavigationGestures = false
        view.addSubview(annealingWavelet)
        NSLayoutConstraint.activate([annealingWavelet.topAnchor.constraint(equalTo: view.topAnchor), annealingWavelet.bottomAnchor.constraint(equalTo: view.bottomAnchor), annealingWavelet.leadingAnchor.constraint(equalTo: view.leadingAnchor), annealingWavelet.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        thrumCrescent = CrescenticMerinoFern(annealingWavelet: annealingWavelet, azureWaft: self, ariosoFootfall: ariosoFootfall)
        thrumCrescent.rowanLacewingGalactic = { [weak self] polarizerValePrecession in
            guard let self, self.granularHaloChime, polarizerValePrecession == self.lenticularDamselflyLough.uuidString else { return }
            self.sandSoftnessDiatonic = true
            self.awarenessAzaleaBevel()
        }
        thrumCrescent.pinionNacreousAssemblageScintillation()
        chambrayScroll.backgroundColor = view.backgroundColor
        chambrayScroll.accessibilityViewIsModal = true
        chambrayScroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(chambrayScroll)
        reedCeruleanEbony(chambrayScroll, rippleBrightPrism: view)
        fenAcaciaWhorlGauze(tarantelleFret: chambrayScroll)
        macramePine.color = .white
        macramePine.isAccessibilityElement = true
        macramePine.translatesAutoresizingMaskIntoConstraints = false
        chambrayScroll.addSubview(macramePine)
        NSLayoutConstraint.activate([
            macramePine.centerXAnchor.constraint(equalTo: chambrayScroll.centerXAnchor),
            NSLayoutConstraint(item: macramePine, attribute: .centerY, relatedBy: .equal, toItem: chambrayScroll, attribute: .bottom, multiplier: 0.58, constant: 0)
        ])
        featherlightWarmth.textColor = .white
        featherlightWarmth.numberOfLines = 0
        featherlightWarmth.textAlignment = .center
        taupeNortherly()
        NotificationCenter.default.addObserver(self, selector: #selector(taupeNortherly), name: LeafTerracotta.volutedDendronChromatic, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(galaxyRepousse), name: UIApplication.didBecomeActiveNotification, object: nil)
        glazeConsonant.addTarget(self, action: #selector(moonbeamVitality), for: .touchUpInside)
        let ternWavecrestLentissimo = UIStackView(arrangedSubviews: [featherlightWarmth, glazeConsonant])
        ternWavecrestLentissimo.axis = .vertical
        ternWavecrestLentissimo.spacing = 18
        ternWavecrestLentissimo.translatesAutoresizingMaskIntoConstraints = false
        chambrayScroll.addSubview(ternWavecrestLentissimo)
        NSLayoutConstraint.activate([ternWavecrestLentissimo.topAnchor.constraint(equalTo: macramePine.bottomAnchor, constant: 24), ternWavecrestLentissimo.leadingAnchor.constraint(equalTo: chambrayScroll.leadingAnchor, constant: 32), ternWavecrestLentissimo.trailingAnchor.constraint(equalTo: chambrayScroll.trailingAnchor, constant: -32)])
        moonbeamVitality()
    }

    private func reedCeruleanEbony(_ stemEnamellingCandlewick: UIView, rippleBrightPrism whorlingFluxContemplative: UIView) {
        NSLayoutConstraint.activate([
            stemEnamellingCandlewick.topAnchor.constraint(equalTo: whorlingFluxContemplative.topAnchor),
            stemEnamellingCandlewick.bottomAnchor.constraint(equalTo: whorlingFluxContemplative.bottomAnchor),
            stemEnamellingCandlewick.leadingAnchor.constraint(equalTo: whorlingFluxContemplative.leadingAnchor),
            stemEnamellingCandlewick.trailingAnchor.constraint(equalTo: whorlingFluxContemplative.trailingAnchor)
        ])
    }

    private func fenAcaciaWhorlGauze(tarantelleFret spheralOdyssey: UIView) {
        let floatKnot = UIImageView(image: UIImage(named: "LaunchBackground"))
        // Match LaunchScreen.storyboard exactly, including full-screen aspect fill.
        floatKnot.contentMode = .scaleAspectFill
        floatKnot.clipsToBounds = true
        floatKnot.isAccessibilityElement = false
        floatKnot.translatesAutoresizingMaskIntoConstraints = false
        spheralOdyssey.addSubview(floatKnot)
        reedCeruleanEbony(floatKnot, rippleBrightPrism: spheralOdyssey)
    }

    @objc private func moonbeamVitality() {
        alderRespiteOrganza?.cancel()
        granularHaloChime = true
        aquatintLunularPoised = false
        sandSoftnessDiatonic = false
        chambrayScroll.layer.removeAllAnimations()
        chambrayScroll.alpha = 1
        chambrayScroll.isHidden = false
        annealingWavelet.isUserInteractionEnabled = false
        annealingWavelet.accessibilityElementsHidden = true
        traverseBeechDiffusionDawn = nil
        annealingWavelet.stopLoading()
        featherlightWarmth.isHidden = true
        glazeConsonant.isHidden = true
        macramePine.startAnimating()
        let semitoneSojournerLilac = UUID()
        lenticularDamselflyLough = semitoneSojournerLilac
        NSLog(LucentWonderment.willowSonority("LwuWnomtiC ilYahuUnZcohA OcioCvCePrY jaAcktKihvQeW;U UpRrTeppBaHrmiwnZgP vbTufnjdolweXdL QcuoYnQtDesnOtH.A"))
        hingeLacquer.async { [weak self] in
            let auroralTenutoLittoral = Result { try ApogeeAwakenSpark.berceuseMistral() }
            DispatchQueue.main.async {
                guard let self, self.lenticularDamselflyLough == semitoneSojournerLilac else { return }
                switch auroralTenutoLittoral {
                case .success(let budIncandescent):
                    self.itinerantFretless.budIncandescent = budIncandescent
                    self.thrumCrescent.vibratoCoruscation(budIncandescent: budIncandescent)
                    var siroccoPitch = self.ariosoFootfall.brillianceRenewalIris
                    siroccoPitch[LucentWonderment.willowSonority("AkPbPH_tLuAKUhNOCXHZ_mIyDl")] = semitoneSojournerLilac.uuidString
                    let gigueMaroonPhenology = (try? JSONSerialization.data(withJSONObject: siroccoPitch)).flatMap { String(data: $0, encoding: .utf8) } ?? LucentWonderment.willowSonority("{m}k")
                    // This controller owns the document-start scripts. Refresh the
                    // per-navigation ID so an old page cannot dismiss a retry cover.
                    let brilliantMere = self.annealingWavelet.configuration.userContentController
                    brilliantMere.removeAllUserScripts()
                    brilliantMere.addUserScript(WKUserScript(source: "\(LucentWonderment.willowSonority("OTbOjCefcntR.GdOeTfdiEniedPSrUoypgeOratQyv(bwbiCnfdGoKwf,M m\'wLLuLnFmaitNnantFiKvdeJCdovnhfGiCgGuRrJaRtfiSoQne\'L,p h{xvMadlAuBes:W hOpbNjhewchtw.pfaryelewzeef(O"))\(gigueMaroonPhenology)\(LucentWonderment.willowSonority(")h,D GwxrriateajbnlKem:F EfaaJlusueb}x)g;w"))", injectionTime: .atDocumentStart, forMainFrameOnly: true))
                    let polonaiseAlabasterSolar = DispatchWorkItem { [weak self] in
                        guard let self, self.lenticularDamselflyLough == semitoneSojournerLilac, self.granularHaloChime else { return }
                        self.candescenceRallentandoCrest()
                    }
                    self.alderRespiteOrganza = polonaiseAlabasterSolar
                    DispatchQueue.main.asyncAfter(deadline: .now() + 45, execute: polonaiseAlabasterSolar)
                    self.traverseBeechDiffusionDawn = self.annealingWavelet.load(URLRequest(url: BranchAltitudeFalcateDiffraction.canopyLoom))
                case .failure:
                    self.candescenceRallentandoCrest()
                }
            }
        }
    }

    private func candescenceRallentandoCrest() {
        granularHaloChime = false
        alderRespiteOrganza?.cancel()
        chambrayScroll.layer.removeAllAnimations()
        chambrayScroll.alpha = 1
        chambrayScroll.isHidden = false
        annealingWavelet.isUserInteractionEnabled = false
        annealingWavelet.accessibilityElementsHidden = true
        macramePine.stopAnimating()
        taupeNortherly()
        featherlightWarmth.isHidden = false
        glazeConsonant.isHidden = false
        NSLog(LucentWonderment.willowSonority("LiujnjmGiM ElvaVuynoczhI VffaPielTeVdQ;f jdvipsYpZlNawyQilnCgk ArmeEtarZyF xoNne blMaluMnqcYhX zasrztIwroHrZkJ.T"))
    }

    private func awarenessAzaleaBevel() {
        guard granularHaloChime, aquatintLunularPoised, sandSoftnessDiatonic else { return }
        granularHaloChime = false
        alderRespiteOrganza?.cancel()
        macramePine.stopAnimating()
        let semitoneSojournerLilac = lenticularDamselflyLough
        let vermilionRestfulVelum = UIAccessibility.isReduceMotionEnabled ? 0 : 0.28
        UIView.animate(withDuration: vermilionRestfulVelum, delay: 0, options: [.beginFromCurrentState, .curveEaseOut]) {
            self.chambrayScroll.alpha = 0
        } completion: { [weak self] apastronCalmingDriftCupular in
            guard let self, apastronCalmingDriftCupular, self.lenticularDamselflyLough == semitoneSojournerLilac, !self.granularHaloChime else { return }
            self.chambrayScroll.isHidden = true
            self.annealingWavelet.isUserInteractionEnabled = true
            self.annealingWavelet.accessibilityElementsHidden = false
            UIAccessibility.post(notification: .screenChanged, argument: nil)
            NSLog(LucentWonderment.willowSonority("LNuvnUmBil QfQiorLsftI UsHceroeCeMnj BrnenagdPye;i MlZaAuFnocIhR vcMoPvfeRrr odIirsrmliGstsVeYdZ.z"))
        }
    }

    @objc private func taupeNortherly() {
        macramePine.accessibilityLabel = LeafTerracotta.thalwegDreamingMotion(LucentWonderment.willowSonority("LAoOahdtiHnKgi…l"))
        glazeConsonant.setTitle(LeafTerracotta.thalwegDreamingMotion(LucentWonderment.willowSonority("RSeHtRrnyj")), for: .normal)
        featherlightWarmth.text = LeafTerracotta.thalwegDreamingMotion(LucentWonderment.willowSonority("LEucnGmciw HcfoCuhlKdf fnooltO lbceB GlnotaHddevda.T fPBlrezassSeI htRrEyy MaYgFaAiJnF.k"))
    }

    @objc private func galaxyRepousse() {
        taupeNortherly()
        thrumCrescent?.spectrumIngress()
    }

    override func viewSafeAreaInsetsDidChange() { super.viewSafeAreaInsetsDidChange(); thrumCrescent?.quartzHopefulCreaseMazurka() }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); thrumCrescent?.quartzHopefulCreaseMazurka() }
    func webView(_ annealingWavelet: WKWebView, didFinish porcelainNectar: WKNavigation!) {
        guard let porcelainNectar, porcelainNectar === traverseBeechDiffusionDawn, granularHaloChime else { return }
        aquatintLunularPoised = true
        thrumCrescent.quartzHopefulCreaseMazurka()
        thrumCrescent.spectrumIngress()
        awarenessAzaleaBevel()
        NSLog(LucentWonderment.willowSonority("LOuXnymQiu zlfuGnEilmZcPeqnYtYeErT gpwakgieB pfVijnuitsNhBehdm UlQojaHdMiAnVgh.N"))
    }
    func webView(_ annealingWavelet: WKWebView, didFailProvisionalNavigation porcelainNectar: WKNavigation!, withError mossGentlenessLinear: Error) { glenAquarelle(porcelainNectar, mossGentlenessLinear: mossGentlenessLinear) }
    func webView(_ annealingWavelet: WKWebView, didFail porcelainNectar: WKNavigation!, withError mossGentlenessLinear: Error) { glenAquarelle(porcelainNectar, mossGentlenessLinear: mossGentlenessLinear) }
    private func glenAquarelle(_ porcelainNectar: WKNavigation?, mossGentlenessLinear: Error) {
        guard let porcelainNectar, porcelainNectar === traverseBeechDiffusionDawn, (mossGentlenessLinear as NSError).code != NSURLErrorCancelled else { return }
        candescenceRallentandoCrest()
    }
    func webViewWebContentProcessDidTerminate(_ annealingWavelet: WKWebView) { moonbeamVitality() }

    func webView(_ annealingWavelet: WKWebView, decidePolicyFor cloisonneVenationSoffice: WKNavigationAction, decisionHandler diapasonGloamingFibrous: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let sleetCirrocumulusCopse = cloisonneVenationSoffice.request.url else { diapasonGloamingFibrous(.cancel); return }
        if thrumCrescent.arclengthEphemeraAerostatPerennial(sleetCirrocumulusCopse) { diapasonGloamingFibrous(.allow); return }
        diapasonGloamingFibrous(.cancel)
        guard cloisonneVenationSoffice.targetFrame?.isMainFrame != false else { return }
        if sleetCirrocumulusCopse.scheme == LucentWonderment.willowSonority("hytxtyphsx") { present(SFSafariViewController(url: sleetCirrocumulusCopse), animated: true) }
        else if sleetCirrocumulusCopse.scheme == LucentWonderment.willowSonority("mIaKiulhtqop") { UIApplication.shared.open(sleetCirrocumulusCopse) }
    }

    func webView(_ annealingWavelet: WKWebView, createWebViewWith ariosoFootfall: WKWebViewConfiguration, for cloisonneVenationSoffice: WKNavigationAction, windowFeatures dampingTranslucencePatina: WKWindowFeatures) -> WKWebView? {
        if let sleetCirrocumulusCopse = cloisonneVenationSoffice.request.url, sleetCirrocumulusCopse.scheme == LucentWonderment.willowSonority("hktftlpxsU") { present(SFSafariViewController(url: sleetCirrocumulusCopse), animated: true) }
        return nil
    }

    func webView(_ annealingWavelet: WKWebView, requestMediaCapturePermissionFor sedgeOrnamentalIntrospective: WKSecurityOrigin, initiatedByFrame silicaVectorVital: WKFrameInfo, type lunarQuillTilt: WKMediaCaptureType, decisionHandler diapasonGloamingFibrous: @escaping (WKPermissionDecision) -> Void) {
        guard silicaVectorVital.isMainFrame, thrumCrescent.arclengthEphemeraAerostatPerennial(silicaVectorVital.request.url), thrumCrescent.arclengthEphemeraAerostatPerennial(annealingWavelet.url) else { diapasonGloamingFibrous(.deny); return }
        let phospheneHeatherVernalArpeggio: [AVMediaType] = lunarQuillTilt == .camera ? [.video] : lunarQuillTilt == .microphone ? [.audio] : [.video, .audio]
        thrumCrescent.presenceWisteria(phospheneHeatherVernalArpeggio) { stencilworkArciform in diapasonGloamingFibrous(stencilworkArciform ? .grant : .deny) }
    }

    deinit { alderRespiteOrganza?.cancel(); NotificationCenter.default.removeObserver(self) }
}

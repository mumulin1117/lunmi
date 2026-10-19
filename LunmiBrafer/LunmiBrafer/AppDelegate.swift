import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let cirriformCymeGauze = UIWindow(frame: UIScreen.main.bounds)
        cirriformCymeGauze.rootViewController = ScarletEquanimousWesterly()
        cirriformCymeGauze.backgroundColor = UIColor(red: 23 / 255, green: 18 / 255, blue: 48 / 255, alpha: 1)
        cirriformCymeGauze.makeKeyAndVisible()
        self.window = cirriformCymeGauze
        return true
    }
}

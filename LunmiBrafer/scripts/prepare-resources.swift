import Foundation
import CryptoKit

// This macOS build tool is compiled by Xcode, never included in the iOS target.
// Native sources supply the real configuration, key and archive implementation.
@main
enum LunmiBuildResources {
    enum BuildFailure: LocalizedError {
        case invalidEnvironment
        case invalidPackage
        case staleSource
        case incompleteSource
        case invalidAPI

        var errorDescription: String? {
            switch self {
            case .invalidEnvironment:
                return "Xcode SRCROOT and DERIVED_FILE_DIR are required."
            case .invalidPackage:
                return "The bundled H5 package is missing, damaged, or paired with a different native key. Send the complete LunmiBrafer folder, or run pnpm sync:ios in lunmi_h5."
            case .staleSource:
                return "Bundled H5 resources do not match the included source. Install Node.js and run pnpm sync:ios in lunmi_h5, then rebuild."
            case .incompleteSource:
                return "The included lunmi_h5 source is incomplete or contains symbolic links. Send only the complete LunmiBrafer folder to build its prebuilt resources, or restore lunmi_h5 and synchronize it."
            case .invalidAPI:
                return "The native API URL must be an HTTP(S) URL with a host and without credentials, query or fragment."
            }
        }
    }

    static func main() {
        do {
            try prepare()
        } catch {
            FileHandle.standardError.write(Data(("error: " + error.localizedDescription + "\n").utf8))
            exit(1)
        }
    }

    static func prepare() throws {
        let environment = ProcessInfo.processInfo.environment
        guard let sourcePath = environment["SRCROOT"], !sourcePath.isEmpty,
              let derivedPath = environment["DERIVED_FILE_DIR"], !derivedPath.isEmpty else {
            throw BuildFailure.invalidEnvironment
        }
        let root = URL(fileURLWithPath: sourcePath, isDirectory: true).standardizedFileURL
        let derived = URL(fileURLWithPath: derivedPath, isDirectory: true)
        let package = root.appendingPathComponent("LunmiBrafer/lunimcenter.bundledata")
        let h5 = root.deletingLastPathComponent().appendingPathComponent("lunmi_h5", isDirectory: true)
        try FileManager.default.createDirectory(at: derived, withIntermediateDirectories: true)

        if FileManager.default.fileExists(atPath: h5.path) {
            let fingerprint: String
            do {
                fingerprint = try sourceFingerprint(h5, environment: environment)
            } catch {
                throw BuildFailure.incompleteSource
            }
            guard try packagedSourceFingerprint(package) == fingerprint else { throw BuildFailure.staleSource }
        }

        let validation = derived.appendingPathComponent("LunmiBuildResources/Validation-" + UUID().uuidString, isDirectory: true)
        defer { try? FileManager.default.removeItem(at: validation) }
        do {
            _ = try ApogeeAwakenSpark.berceuseMistral(
                ecruBeam: package,
                kanthaHydrologySonatina: validation,
                tramontaneFloretPilgrim: RamblingHelix.scatteringSable
            )
        } catch {
            throw BuildFailure.invalidPackage
        }
        print("Verified bundled H5 authentication, decompression and file fingerprints.")

        let infoData = try Data(contentsOf: root.appendingPathComponent("LunmiBrafer/Info.plist"))
        guard var info = try PropertyListSerialization.propertyList(from: infoData, format: nil) as? [String: Any] else {
            throw BuildFailure.invalidEnvironment
        }
        guard let url = URL(string: PersistentPivotGlow().portatoSolace),
              let host = url.host, !host.isEmpty,
              let scheme = url.scheme?.lowercased(), ["http", "https"].contains(scheme),
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil else {
            throw BuildFailure.invalidAPI
        }
        if scheme == "http" {
            var transport = info["NSAppTransportSecurity"] as? [String: Any] ?? [:]
            var domains = transport["NSExceptionDomains"] as? [String: Any] ?? [:]
            domains[host] = ["NSExceptionAllowsInsecureHTTPLoads": true, "NSIncludesSubdomains": false]
            transport["NSExceptionDomains"] = domains
            info["NSAppTransportSecurity"] = transport
            print("Configured API HTTP exception for " + host)
        }
        let output = try PropertyListSerialization.data(fromPropertyList: info, format: .xml, options: 0)
        try output.write(to: derived.appendingPathComponent("LunmiBrafer-Info.plist"), options: .atomic)
    }

    static func packagedSourceFingerprint(_ package: URL) throws -> String {
        do {
            let data = try Data(contentsOf: package, options: .mappedIfSafe)
            guard data.count >= 68, data.prefix(8) == Data("LUNIMC02".utf8),
                  let keyData = Data(base64Encoded: RamblingHelix.scatteringSable), keyData.count == 32 else {
                throw BuildFailure.invalidPackage
            }
            let length = data[8..<12].enumerated().reduce(0) { $0 | (Int($1.element) << ($1.offset * 8)) }
            guard length >= 28, length <= 8 * 1024 * 1024, 12 + length + 28 <= data.count else {
                throw BuildFailure.invalidPackage
            }
            let box = try AES.GCM.SealedBox(combined: data.subdata(in: 12..<(12 + length)))
            let plaintext = try AES.GCM.open(box, using: SymmetricKey(data: keyData), authenticating: data.prefix(12))
            guard let manifest = try JSONSerialization.jsonObject(with: plaintext) as? [String: Any],
                  let fingerprint = manifest["sourceSHA256"] as? String else { throw BuildFailure.invalidPackage }
            return fingerprint
        } catch {
            throw BuildFailure.invalidPackage
        }
    }

    // Match sync-ios.mjs exactly, including JS UTF-16 sorting, zero separators,
    // environment files and public VITE_* build variables. Never log their values.
    static func sourceFingerprint(_ root: URL, environment: [String: String]) throws -> String {
        let directories = ["src", "static", "scripts"]
        let fixed = ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "vite.config.js", "index.html"]
        var files = try directories.flatMap { try filesUnder(root.appendingPathComponent($0), relativePath: $0) }
        let environmentFiles = try FileManager.default.contentsOfDirectory(atPath: root.path)
            .filter { $0 == ".env" || $0.hasPrefix(".env.") }
        files += fixed + environmentFiles
        files.sort { $0.utf16.lexicographicallyPrecedes($1.utf16) }
        var hash = SHA256()
        for relative in files {
            hash.update(data: Data(relative.utf8))
            hash.update(data: Data([0]))
            hash.update(data: try Data(contentsOf: root.appendingPathComponent(relative), options: .mappedIfSafe))
            hash.update(data: Data([0]))
        }
        for key in environment.keys.filter({ $0.hasPrefix("VITE_") }).sorted(by: { $0.utf16.lexicographicallyPrecedes($1.utf16) }) {
            hash.update(data: Data((key + "=" + environment[key]! + "\0").utf8))
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
    }

    static func filesUnder(_ directory: URL, relativePath: String) throws -> [String] {
        let keys: Set<URLResourceKey> = [.isSymbolicLinkKey, .isDirectoryKey, .isRegularFileKey]
        let children = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: Array(keys))
        var files: [String] = []
        for child in children where child.lastPathComponent != ".DS_Store" {
            let values = try child.resourceValues(forKeys: keys)
            guard values.isSymbolicLink != true else { throw BuildFailure.incompleteSource }
            let relative = relativePath + "/" + child.lastPathComponent
            if values.isDirectory == true { files += try filesUnder(child, relativePath: relative) }
            else if values.isRegularFile == true { files.append(relative) }
        }
        return files
    }
}

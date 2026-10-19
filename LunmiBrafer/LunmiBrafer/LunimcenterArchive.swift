import Foundation
import CryptoKit
import Compression
enum LunimcenterPackageKey {
    static let base64 = "BDzsD6GPsg+HU29soZsDrdxP6LRoGCeYhKvLSRN3g5I="
}
enum LunimcenterArchive {
    enum Failure: Error { case invalidPackage }
    private static let maximumSize = 512 * 1024 * 1024
    private static let envelopeMagic = Data("LUNIMC02".utf8)
    private static let payloadAAD = envelopeMagic + Data("payload".utf8)
    private static let maximumManifestSize = 8 * 1024 * 1024
    private static let payloadMagic = Data("LNCFILES".utf8)
    private static let lock = NSLock()

    private struct FileRecord: Decodable {
        let path: String
        let size: Int
        let sha256: String
    }

    private struct Manifest: Decodable {
        let version: Int
        let project: String
        let archiveName: String
        let encryption: String
        let compression: [String]
        let keyID: String
        let contentSHA256: String
        let entrySHA256: String
        let ciphertextSHA256: String
        let payloadSHA256: String
        let payloadSize: Int
        let innerSize: Int
        let fileCount: Int
        let files: [FileRecord]
    }

    static func prepare(bundle: Bundle = .main) throws -> URL {
        guard let archiveURL = bundle.url(forResource: "lunimcenter", withExtension: "bundledata"),
              let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            throw Failure.invalidPackage
        }
        let cacheRoot = caches.appendingPathComponent(bundle.bundleIdentifier ?? "LunmiBrafer", isDirectory: true)
            .appendingPathComponent("lunimcenter", isDirectory: true)
        return try prepare(archiveURL: archiveURL, cacheRoot: cacheRoot, encodedKey: LunimcenterPackageKey.base64)
    }

    // Kept independent of UIKit so the same decoder can be verified against the
    // build tool on macOS without adding test targets or fixtures to the app.
    static func prepare(archiveURL: URL, cacheRoot: URL, encodedKey: String) throws -> URL {
        lock.lock()
        defer { lock.unlock() }
        let fm = FileManager.default
        let archiveSize = try archiveURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard archiveSize >= 68, archiveSize <= maximumSize,
              let keyData = Data(base64Encoded: encodedKey), keyData.count == 32 else { throw Failure.invalidPackage }
        let archive = try Data(contentsOf: archiveURL, options: .mappedIfSafe)
        var cursor = Cursor(data: archive)
        guard try cursor.take(8) == envelopeMagic else { throw Failure.invalidPackage }
        let manifestSize = try cursor.number(4)
        guard manifestSize >= 28, manifestSize <= maximumManifestSize,
              manifestSize + 40 <= archive.count else { throw Failure.invalidPackage }
        let header = archive.prefix(12)
        let key = SymmetricKey(data: keyData)
        let manifestBox = try AES.GCM.SealedBox(combined: cursor.take(Int(manifestSize)))
        let manifestData = try AES.GCM.open(manifestBox, using: key, authenticating: header)
        let manifest = try JSONDecoder().decode(Manifest.self, from: manifestData)
        guard manifest.version == 3, manifest.project == "LunmiBrafer",
              manifest.archiveName == "lunimcenter.bundledata", manifest.encryption == "AES-256-GCM",
              manifest.compression == ["deflate-raw", "deflate-raw"], manifest.keyID == digest(keyData),
              manifest.fileCount > 0, manifest.fileCount <= 20000, manifest.files.count == manifest.fileCount,
              manifest.payloadSize >= 12, manifest.payloadSize <= maximumSize,
              manifest.innerSize > 0, manifest.innerSize <= maximumSize,
              [manifest.contentSHA256, manifest.entrySHA256, manifest.ciphertextSHA256, manifest.payloadSHA256]
                .allSatisfy(validDigest) else { throw Failure.invalidPackage }
        var names = Set<String>()
        var expectedSize = 12
        for record in manifest.files {
            guard safePath(record.path), record.size >= 0, record.size <= maximumSize, validDigest(record.sha256),
                  names.insert(record.path.precomposedStringWithCanonicalMapping.lowercased()).inserted else {
                throw Failure.invalidPackage
            }
            expectedSize += 44 + record.path.utf8.count + record.size
            guard expectedSize <= maximumSize else { throw Failure.invalidPackage }
        }
        guard expectedSize == manifest.payloadSize,
              manifest.files.first(where: { $0.path == "index.html" })?.size ?? 0 > 0 else { throw Failure.invalidPackage }
        let encryptedPayload = archive.suffix(from: cursor.position)
        guard digest(encryptedPayload) == manifest.ciphertextSHA256 else { throw Failure.invalidPackage }
        let archiveSHA256 = digest(archive)
        try fm.createDirectory(at: cacheRoot, withIntermediateDirectories: true)
        var cacheDirectory = cacheRoot
        var cacheValues = URLResourceValues()
        cacheValues.isExcludedFromBackup = true
        try cacheDirectory.setResourceValues(cacheValues)
        let target = cacheRoot.appendingPathComponent(archiveSHA256, isDirectory: true)
        if validCache(target, manifest: manifest) { return target }

        // AES-GCM authenticates the complete compressed bytes and the versioned
        // envelope header before either bounded decompression layer is decoded.
        let payload: Data = try {
            let box = try AES.GCM.SealedBox(combined: encryptedPayload)
            let compressed = try AES.GCM.open(box, using: key, authenticating: payloadAAD)
            let inner = try inflate(compressed, expectedSize: manifest.innerSize)
            return try inflate(inner, expectedSize: manifest.payloadSize)
        }()
        guard digest(payload) == manifest.payloadSHA256 else { throw Failure.invalidPackage }
        let staging = cacheRoot.appendingPathComponent(".staging-" + UUID().uuidString, isDirectory: true)
        try fm.createDirectory(at: staging, withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: staging) }
        try extract(payload, manifest: manifest, into: staging)
        // Publish only a complete, verified directory. A failed unpack leaves any
        // previous valid version available, and never falls back to plaintext.
        if fm.fileExists(atPath: target.path) { try fm.removeItem(at: target) }
        try fm.moveItem(at: staging, to: target)
        for old in (try? fm.contentsOfDirectory(at: cacheRoot, includingPropertiesForKeys: nil)) ?? [] {
            if old.lastPathComponent != archiveSHA256
                && (validDigest(old.lastPathComponent) || old.lastPathComponent.hasPrefix(".staging-")) {
                try? fm.removeItem(at: old)
            }
        }
        return target
    }

    private static func digest(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func validDigest(_ value: String) -> Bool {
        value.count == 64 && value.utf8.allSatisfy { (48...57).contains($0) || (97...102).contains($0) }
    }

    private static func safePath(_ name: String) -> Bool {
        !name.isEmpty && name.utf8.count <= 4096 && !name.contains("\\")
            && !name.unicodeScalars.contains(where: { $0.value < 32 })
            && name.split(separator: "/", omittingEmptySubsequences: false).allSatisfy { !$0.isEmpty && $0 != "." && $0 != ".." }
    }

    private static func fileURL(_ name: String, root: URL) throws -> URL {
        guard safePath(name) else { throw Failure.invalidPackage }
        let canonicalRoot = root.resolvingSymlinksInPath().standardizedFileURL
        let file = canonicalRoot.appendingPathComponent(name).resolvingSymlinksInPath().standardizedFileURL
        guard file.path.hasPrefix(canonicalRoot.path + "/") else { throw Failure.invalidPackage }
        return file
    }

    private static func validCache(_ root: URL, manifest: Manifest) -> Bool {
        do {
            let fm = FileManager.default
            let rootValues = try root.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
            guard rootValues.isDirectory == true, rootValues.isSymbolicLink != true else { return false }
            guard let enumerator = fm.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]) else { return false }
            var count = 0
            for case let url as URL in enumerator {
                let values = try url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
                guard values.isSymbolicLink != true else { return false }
                if values.isRegularFile == true { count += 1 }
            }
            guard count == manifest.fileCount else { return false }
            var content = SHA256()
            for record in manifest.files {
                let file = try fileURL(record.path, root: root)
                let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
                guard values.isRegularFile == true, values.isSymbolicLink != true, values.fileSize == record.size else { return false }
                let data = try Data(contentsOf: file, options: .mappedIfSafe)
                guard digest(data) == record.sha256 else { return false }
                content.update(data: Data(record.path.utf8))
                content.update(data: Data([0]))
                content.update(data: data)
                content.update(data: Data([0]))
            }
            return content.finalize().map { String(format: "%02x", $0) }.joined() == manifest.contentSHA256
                && manifest.files.first(where: { $0.path == "index.html" })?.sha256 == manifest.entrySHA256
        } catch { return false }
    }

    private static func inflate(_ data: Data, expectedSize: Int) throws -> Data {
        guard expectedSize > 0, expectedSize <= maximumSize else { throw Failure.invalidPackage }
        let placeholder = UnsafeMutablePointer<UInt8>.allocate(capacity: 1)
        defer { placeholder.deallocate() }
        var stream = compression_stream(dst_ptr: placeholder, dst_size: 0, src_ptr: UnsafePointer(placeholder), src_size: 0, state: nil)
        guard compression_stream_init(&stream, COMPRESSION_STREAM_DECODE, COMPRESSION_ZLIB) != COMPRESSION_STATUS_ERROR else {
            throw Failure.invalidPackage
        }
        defer { compression_stream_destroy(&stream) }
        var output = Data()
        output.reserveCapacity(expectedSize)
        return try data.withUnsafeBytes { source in
            guard let sourcePointer = source.bindMemory(to: UInt8.self).baseAddress else { throw Failure.invalidPackage }
            stream.src_ptr = sourcePointer
            stream.src_size = data.count
            var chunk = [UInt8](repeating: 0, count: 65536)
            return try chunk.withUnsafeMutableBytes { destination in
                let pointer = destination.bindMemory(to: UInt8.self).baseAddress!
                while true {
                    let previousSourceSize = stream.src_size
                    stream.dst_ptr = pointer
                    stream.dst_size = destination.count
                    let status = compression_stream_process(&stream, Int32(COMPRESSION_STREAM_FINALIZE.rawValue))
                    let written = destination.count - stream.dst_size
                    guard written <= expectedSize - output.count else { throw Failure.invalidPackage }
                    output.append(pointer, count: written)
                    if status == COMPRESSION_STATUS_END {
                        guard stream.src_size == 0, output.count == expectedSize else { throw Failure.invalidPackage }
                        return output
                    }
                    guard status == COMPRESSION_STATUS_OK, written > 0 || stream.src_size < previousSourceSize else {
                        throw Failure.invalidPackage
                    }
                }
            }
        }
    }

    private struct Cursor {
        let data: Data
        var position = 0
        mutating func take(_ count: Int) throws -> Data {
            guard count >= 0, count <= data.count - position else { throw Failure.invalidPackage }
            defer { position += count }
            return data.subdata(in: position..<(position + count))
        }
        mutating func number(_ bytes: Int) throws -> UInt64 {
            try take(bytes).enumerated().reduce(UInt64(0)) { $0 | (UInt64($1.element) << ($1.offset * 8)) }
        }
    }

    private static func extract(_ payload: Data, manifest: Manifest, into root: URL) throws {
        var cursor = Cursor(data: payload)
        guard try cursor.take(8) == payloadMagic, try cursor.number(4) == UInt64(manifest.fileCount) else { throw Failure.invalidPackage }
        var content = SHA256()
        for record in manifest.files {
            let pathSize = try cursor.number(4)
            let fileSize = try cursor.number(8)
            let hash = try cursor.take(32).map { String(format: "%02x", $0) }.joined()
            guard pathSize <= 4096, fileSize == UInt64(record.size), hash == record.sha256,
                  let name = String(data: try cursor.take(Int(pathSize)), encoding: .utf8), name == record.path else { throw Failure.invalidPackage }
            let data = try cursor.take(record.size)
            guard digest(data) == record.sha256 else { throw Failure.invalidPackage }
            let file = try fileURL(name, root: root)
            try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
            try data.write(to: file, options: .atomic)
            content.update(data: Data(name.utf8))
            content.update(data: Data([0]))
            content.update(data: data)
            content.update(data: Data([0]))
        }
        guard cursor.position == payload.count,
              content.finalize().map({ String(format: "%02x", $0) }).joined() == manifest.contentSHA256,
              manifest.files.first(where: { $0.path == "index.html" })?.sha256 == manifest.entrySHA256 else { throw Failure.invalidPackage }
    }
}

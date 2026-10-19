import Foundation
import WebKit

enum BundledWebContent {
    static let scheme = "lunmi"
    static let host = "bundle"
    static let entryURL = URL(string: "lunmi://bundle/index.html")!

    static func contains(_ url: URL) -> Bool {
        url.scheme == scheme && url.host == host && url.port == nil
            && url.user == nil && url.password == nil
    }
}

struct BundledResourceResponse {
    let status: Int
    let headers: [String: String]
    let body: Data
}

enum BundledResourceLoader {
    static func response(for request: URLRequest, root: URL) -> BundledResourceResponse {
        guard let url = request.url, BundledWebContent.contains(url) else { return error(403) }
        let method = request.httpMethod ?? "GET"
        guard method == "GET" || method == "HEAD" else { return error(405) }
        // Decode once, reject hidden/traversal paths, and resolve symlinks before reading.
        guard let encoded = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedPath,
              let decoded = encoded.removingPercentEncoding,
              decoded.hasPrefix("/"), !decoded.contains("\0"),
              !decoded.split(separator: "/").contains(where: { $0.hasPrefix(".") }) else { return error(403) }
        let canonicalRoot = root.resolvingSymlinksInPath().standardizedFileURL
        let relative = decoded == "/" ? "index.html" : String(decoded.dropFirst())
        let file = canonicalRoot.appendingPathComponent(relative).resolvingSymlinksInPath().standardizedFileURL
        guard file.path.hasPrefix(canonicalRoot.path + "/") else { return error(403) }
        guard (try? file.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true,
              let content = try? Data(contentsOf: file, options: .mappedIfSafe) else { return error(404) }
        var start = 0
        var end = max(0, content.count - 1)
        var status = 200
        if let range = request.value(forHTTPHeaderField: "Range") {
            guard range.hasPrefix("bytes="), !range.contains(","), !content.isEmpty else { return error(416, size: content.count) }
            let values = range.dropFirst(6).split(separator: "-", omittingEmptySubsequences: false)
            guard values.count == 2 else { return error(416, size: content.count) }
            if values[0].isEmpty {
                guard let suffix = Int(values[1]), suffix > 0 else { return error(416, size: content.count) }
                start = max(0, content.count - suffix)
            } else {
                guard let requestedStart = Int(values[0]), requestedStart >= 0, requestedStart < content.count else { return error(416, size: content.count) }
                start = requestedStart
                if !values[1].isEmpty {
                    guard let requestedEnd = Int(values[1]), requestedEnd >= start else { return error(416, size: content.count) }
                    end = min(end, requestedEnd)
                }
            }
            status = 206
        }
        let body = content.isEmpty ? Data() : content.subdata(in: start..<(end + 1))
        var headers = baseHeaders
        headers["Content-Type"] = mimeType(file.pathExtension)
        headers["Content-Length"] = String(body.count)
        headers["Accept-Ranges"] = "bytes"
        if status == 206 { headers["Content-Range"] = "bytes \(start)-\(end)/\(content.count)" }
        return BundledResourceResponse(status: status, headers: headers, body: method == "HEAD" ? Data() : body)
    }

    private static var baseHeaders: [String: String] {
        ["Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Access-Control-Allow-Origin": "*"]
    }

    private static func error(_ code: Int, size: Int? = nil) -> BundledResourceResponse {
        var headers = baseHeaders
        headers["Content-Length"] = "0"
        if let size { headers["Content-Range"] = "bytes */\(size)" }
        return BundledResourceResponse(status: code, headers: headers, body: Data())
    }

    private static func mimeType(_ suffix: String) -> String {
        ["html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "mjs": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8", "json": "application/json", "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif", "mp4": "video/mp4", "m4a": "audio/mp4", "mp3": "audio/mpeg", "wav": "audio/wav", "ttf": "font/ttf", "woff": "font/woff", "woff2": "font/woff2"][suffix.lowercased()] ?? "application/octet-stream"
    }
}

// WebKit calls this handler for packaged resources; no socket or HTTP listener is created.
final class BundledWebContentHandler: NSObject, WKURLSchemeHandler {
    private let root: URL

    init(root: URL) { self.root = root }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let resource = BundledResourceLoader.response(for: urlSchemeTask.request, root: root)
        guard let url = urlSchemeTask.request.url,
              let response = HTTPURLResponse(url: url, statusCode: resource.status, httpVersion: nil, headerFields: resource.headers) else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        urlSchemeTask.didReceive(response)
        if !resource.body.isEmpty { urlSchemeTask.didReceive(resource.body) }
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Reads finish synchronously; there is no outstanding network task to cancel.
    }
}

import SwiftUI
import WebKit

struct GreatnessWebContainer: UIViewRepresentable {
    let url = URL(string: "https://mufasafitsite.onrender.com/greatness.html")!

    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(context.coordinator, name: "healthKit")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.webView = webView
        webView.load(URLRequest(url: url))
        return webView
    }
    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler {
        private static let backendAuthorizationURL = URL(string: "https://mufasa-fitness-node.onrender.com/api/admin/diagnostics/healthkit/authorize")!
        weak var webView: WKWebView?
        private let healthKit = HealthKitBridge()

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "healthKit",
                  message.frameInfo.request.url?.host == "mufasafitsite.onrender.com",
                  let request = message.body as? [String: Any],
                  request["action"] as? String == "diagnostic",
                  let token = request["token"] as? String,
                  token.range(of: #"^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$"#, options: .regularExpression) != nil else {
                sendFailure("ADMIN_AUTHORIZATION_REQUIRED")
                return
            }
            Task {
                guard await authorizeAdministrator(token: token) else {
                    await MainActor.run { self.sendFailure("ADMIN_AUTHORIZATION_FAILED") }
                    return
                }
                let response = await healthKit.diagnostic(days: min(max(request["days"] as? Int ?? 7, 1), 30))
                let data = try? JSONEncoder().encode(response)
                let json = data.flatMap { String(data: $0, encoding: .utf8) } ?? "{\"status\":\"BRIDGE_FAILURE\",\"healthKitAvailable\":true,\"authorizationRequestCompleted\":false,\"recentWorkoutCount\":0,\"mostRecentWorkoutStartTime\":null,\"durationSeconds\":null,\"distanceMeters\":null,\"routeAvailable\":false}"
                await MainActor.run {
                    self.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('greatness:healthkit-response',{detail:\(json)}))")
                }
            }
        }

        private func authorizeAdministrator(token: String) async -> Bool {
            var request = URLRequest(url: Self.backendAuthorizationURL)
            request.httpMethod = "GET"
            request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            do {
                let (_, response) = try await URLSession.shared.data(for: request)
                return (response as? HTTPURLResponse)?.statusCode == 200
            } catch {
                return false
            }
        }

        private func sendFailure(_ status: String) {
            let detail = "{\"status\":\"\(status)\",\"healthKitAvailable\":false,\"authorizationRequestCompleted\":false,\"recentWorkoutCount\":0,\"mostRecentWorkoutStartTime\":null,\"durationSeconds\":null,\"distanceMeters\":null,\"routeAvailable\":false}"
            webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('greatness:healthkit-response',{detail:\(detail)}))")
        }
    }
}

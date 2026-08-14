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
        weak var webView: WKWebView?
        private let healthKit = HealthKitBridge()

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            let enabled = (Bundle.main.object(forInfoDictionaryKey: "HealthKitFeatureEnabled") as? String)?.lowercased()
            guard enabled == "yes" || enabled == "true" else { return }
            guard message.name == "healthKit",
                  let request = message.body as? [String: Any],
                  request["action"] as? String == "recentWorkouts" else { return }
            Task {
                let response = await healthKit.recentWorkouts(days: min(max(request["days"] as? Int ?? 7, 1), 30))
                let data = try? JSONEncoder().encode(response)
                let json = data.flatMap { String(data: $0, encoding: .utf8) } ?? "{\"status\":\"bridge_failed\",\"workouts\":[]}"
                await MainActor.run {
                    self.webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('greatness:healthkit-response',{detail:\(json)}))")
                }
            }
        }
    }
}

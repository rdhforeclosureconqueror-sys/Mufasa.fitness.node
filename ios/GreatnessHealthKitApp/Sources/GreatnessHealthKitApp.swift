import SwiftUI

@main
struct GreatnessHealthKitApp: App {
    @State private var showingDiagnostic = false

    var body: some Scene {
        WindowGroup {
            ZStack(alignment: .bottomTrailing) {
                GreatnessWebContainer()
                if healthKitEnabled {
                    Button("HealthKit Test") { showingDiagnostic = true }
                        .buttonStyle(.borderedProminent)
                        .padding()
                        .accessibilityIdentifier("healthkit-diagnostic-button")
                }
            }
            .sheet(isPresented: $showingDiagnostic) { HealthKitDiagnosticView() }
        }
    }

    private var healthKitEnabled: Bool {
        let value = (Bundle.main.object(forInfoDictionaryKey: "HealthKitFeatureEnabled") as? String)?.lowercased()
        return value == "yes" || value == "true"
    }
}

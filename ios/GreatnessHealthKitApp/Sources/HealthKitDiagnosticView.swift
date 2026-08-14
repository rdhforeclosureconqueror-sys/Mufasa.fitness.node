import SwiftUI

@MainActor
final class HealthKitDiagnosticModel: ObservableObject {
    @Published var result: HealthKitDiagnosticResponse?
    @Published var isLoading = false
    private let bridge = HealthKitBridge()

    func run() {
        guard !isLoading else { return }
        isLoading = true
        Task {
            result = await bridge.diagnostic(days: 7)
            isLoading = false
        }
    }
}

struct HealthKitDiagnosticView: View {
    @StateObject private var model = HealthKitDiagnosticModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                row("HealthKit available", yesNo(model.result?.healthKitAvailable))
                row("Authorization requested", yesNo(model.result?.authorizationRequested))
                row("Authorization result", model.result?.authorizationResult ?? "NOT REQUESTED")
                row("Recent walking/running workout count", model.result.map { String($0.recentWorkoutCount) } ?? "—")
                row("Most recent workout start time", model.result?.mostRecentWorkoutStartTime?.formatted() ?? "—")
                row("Duration", model.result?.durationSeconds.map { Duration.seconds($0).formatted() } ?? "—")
                row("Distance", model.result?.distanceMeters.map { Measurement(value: $0, unit: UnitLength.meters).formatted() } ?? "—")
                row("Route available", yesNo(model.result?.routeAvailable))

                if let status = model.result?.status, status != .ready {
                    Text(message(for: status))
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("healthkit-diagnostic-error")
                }

                Button(model.isLoading ? "Checking…" : "Request Permission & Check") { model.run() }
                    .disabled(model.isLoading)
            }
            .navigationTitle("HealthKit Diagnostic")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }

    private func row(_ title: String, _ value: String) -> some View {
        LabeledContent(title, value: value)
    }

    private func yesNo(_ value: Bool?) -> String { value.map { $0 ? "YES" : "NO" } ?? "—" }

    private func message(for status: HealthKitDiagnosticStatus) -> String {
        switch status {
        case .healthKitUnavailable: return "HealthKit is unavailable on this device."
        case .permissionDenied: return "HealthKit permission was denied or restricted."
        case .noWorkoutsFound: return "No recent walking or running workouts were found. HealthKit keeps read-denial status private."
        case .backendFeatureDisabled: return "The backend HealthKit feature is disabled."
        case .ingestionDisabled: return "HealthKit evidence ingestion is disabled."
        case .bridgeFailure: return "The HealthKit bridge failed. Try again."
        case .ready: return ""
        }
    }
}

import Foundation
import HealthKit

enum HealthKitDiagnosticStatus: String, Codable {
    case ready = "READY"
    case healthKitUnavailable = "HEALTHKIT_UNAVAILABLE"
    case permissionDenied = "PERMISSION_DENIED"
    case noWorkoutsFound = "NO_WORKOUTS_FOUND"
    case bridgeFailure = "BRIDGE_FAILURE"
}

struct HealthKitDiagnosticResponse: Codable {
    let status: HealthKitDiagnosticStatus
    let healthKitAvailable: Bool
    let authorizationRequestCompleted: Bool
    let recentWorkoutCount: Int
    let mostRecentWorkoutStartTime: Date?
    let durationSeconds: Double?
    let distanceMeters: Double?
    let routeAvailable: Bool
}

final class HealthKitBridge {
    private let store = HKHealthStore()

    func diagnostic(days: Int) async -> HealthKitDiagnosticResponse {
        guard HKHealthStore.isHealthDataAvailable() else {
            return response(.healthKitUnavailable, available: false, requestCompleted: false)
        }

        let workoutType = HKObjectType.workoutType()
        do {
            try await store.requestAuthorization(toShare: [], read: [workoutType, HKSeriesType.workoutRoute()])
            let start = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
            let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
            let descriptor = HKSampleQueryDescriptor(
                predicates: [.workout(predicate)],
                sortDescriptors: [SortDescriptor(\.startDate, order: .reverse)],
                limit: 100
            )
            let workouts = try await descriptor.result(for: store).filter {
                $0.workoutActivityType == .running || $0.workoutActivityType == .walking
            }
            guard let mostRecent = workouts.first else {
                // HealthKit intentionally does not disclose whether read access was denied;
                // an empty query is therefore reported without making a false grant claim.
                return response(.noWorkoutsFound, available: true, requestCompleted: true)
            }
            return HealthKitDiagnosticResponse(
                status: .ready,
                healthKitAvailable: true,
                authorizationRequestCompleted: true,
                recentWorkoutCount: workouts.count,
                mostRecentWorkoutStartTime: mostRecent.startDate,
                durationSeconds: mostRecent.duration,
                distanceMeters: mostRecent.totalDistance?.doubleValue(for: .meter()) ?? 0,
                routeAvailable: try await hasRoute(for: mostRecent)
            )
        } catch let error as HKError where error.code == .errorAuthorizationDenied {
            return response(.permissionDenied, available: true, requestCompleted: true)
        } catch {
            return response(.bridgeFailure, available: true, requestCompleted: true)
        }
    }

    private func hasRoute(for workout: HKWorkout) async throws -> Bool {
        let predicate = HKQuery.predicateForObjects(from: workout)
        let routes = try await HKSampleQueryDescriptor(
            predicates: [.sample(type: HKSeriesType.workoutRoute(), predicate: predicate)],
            sortDescriptors: [],
            limit: 1
        ).result(for: store)
        return routes.first is HKWorkoutRoute
    }

    private func response(
        _ status: HealthKitDiagnosticStatus,
        available: Bool,
        requestCompleted: Bool
    ) -> HealthKitDiagnosticResponse {
        HealthKitDiagnosticResponse(
            status: status,
            healthKitAvailable: available,
            authorizationRequestCompleted: requestCompleted,
            recentWorkoutCount: 0,
            mostRecentWorkoutStartTime: nil,
            durationSeconds: nil,
            distanceMeters: nil,
            routeAvailable: false
        )
    }
}

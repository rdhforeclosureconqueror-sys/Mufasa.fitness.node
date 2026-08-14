import Foundation
import HealthKit

struct HealthKitPoint: Codable { let latitude: Double; let longitude: Double; let timestamp: Date }
struct HealthKitRoute: Codable { let points: [HealthKitPoint] }
struct HealthKitWorkoutEvidence: Codable {
    let sourceRecordId: String
    let workoutType: String
    let startedAt: Date
    let endedAt: Date
    let durationSeconds: Double
    let distanceMeters: Double
    let routeAvailable: Bool
    let route: HealthKitRoute?
}
struct HealthKitResponse: Codable { let status: String; let workouts: [HealthKitWorkoutEvidence] }

final class HealthKitBridge {
    private let store = HKHealthStore()

    func recentWorkouts(days: Int) async -> HealthKitResponse {
        guard HKHealthStore.isHealthDataAvailable() else { return .init(status: "unavailable", workouts: []) }
        let workoutType = HKObjectType.workoutType()
        do {
            try await store.requestAuthorization(toShare: [], read: [workoutType, HKSeriesType.workoutRoute()])
            let start = Calendar.current.date(byAdding: .day, value: -days, to: Date())!
            let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
            let descriptor = HKSampleQueryDescriptor(predicates: [.workout(predicate)], sortDescriptors: [SortDescriptor(\.startDate, order: .reverse)], limit: 100)
            let samples = try await descriptor.result(for: store)
            var evidence: [HealthKitWorkoutEvidence] = []
            for workout in samples where workout.workoutActivityType == .running || workout.workoutActivityType == .walking {
                let route = try? await readRoute(for: workout)
                evidence.append(.init(sourceRecordId: workout.uuid.uuidString, workoutType: workout.workoutActivityType == .running ? "running" : "walking", startedAt: workout.startDate, endedAt: workout.endDate, durationSeconds: workout.duration, distanceMeters: workout.totalDistance?.doubleValue(for: .meter()) ?? 0, routeAvailable: route != nil, route: route))
            }
            return .init(status: "authorized", workouts: evidence)
        } catch {
            return .init(status: "denied_or_failed", workouts: [])
        }
    }

    private func readRoute(for workout: HKWorkout) async throws -> HealthKitRoute? {
        let predicate = HKQuery.predicateForObjects(from: workout)
        let routes = try await HKSampleQueryDescriptor(predicates: [.sample(type: HKSeriesType.workoutRoute(), predicate: predicate)], sortDescriptors: []).result(for: store)
        guard let route = routes.first as? HKWorkoutRoute else { return nil }
        return try await withCheckedThrowingContinuation { continuation in
            var points: [HealthKitPoint] = []
            let query = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
                if let error { continuation.resume(throwing: error); return }
                points.append(contentsOf: (locations ?? []).map { .init(latitude: $0.coordinate.latitude, longitude: $0.coordinate.longitude, timestamp: $0.timestamp) })
                if done { continuation.resume(returning: HealthKitRoute(points: points)) }
            }
            self.store.execute(query)
        }
    }
}

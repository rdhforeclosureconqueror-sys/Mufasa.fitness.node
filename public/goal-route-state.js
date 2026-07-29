export const METERS_PER_MILE = 1609.344;

export function createGoalRouteState(readGoal) {
  let goalRevision = 0, requestGeneration = 0, controller = null, selectedRoute = null;
  const snapshot = () => {
    const goal = readGoal(), targetDistanceMeters = Number(goal?.distanceMeters);
    if (!Number.isFinite(targetDistanceMeters) || targetDistanceMeters <= 0) throw new Error("Choose a distance goal above first.");
    return Object.freeze({ ...goal, targetDistanceMeters, displayValue: goal.customValue ?? goal.label, displayUnit: goal.customUnit ?? "preset", goalRevision });
  };
  const changed = () => { goalRevision++; requestGeneration++; controller?.abort(); controller=null; selectedRoute=null; return goalRevision; };
  const begin = () => { controller?.abort(); controller=new AbortController(); return { goal:snapshot(), signal:controller.signal, requestGeneration:++requestGeneration }; };
  const accepts = (response, request) => request.requestGeneration===requestGeneration && request.goal.goalRevision===goalRevision && Number(response?.goalRevision)===goalRevision && Math.abs(Number(response?.requestedTargetDistanceMeters)-snapshot().targetDistanceMeters)<.001;
  return { snapshot, changed, begin, accepts, revision:()=>goalRevision, select(route){selectedRoute=route;}, selected:()=>selectedRoute };
}

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMovementContractValidator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const freeze = value => Object.freeze(value);
  const hasContacts = (phase, required) => required.every(contact => (phase.contacts || []).includes(contact));

  function preflight(spec, contract) {
    const failures = [];
    if (!spec || !contract) return freeze({ valid: false, failures: freeze(["spec_and_contract_required"]) });
    if (spec.exerciseId !== contract.exerciseId) failures.push("exercise_id_mismatch");
    if (JSON.stringify(spec.phaseOrder || []) !== JSON.stringify(contract.phaseOrder || [])) failures.push("phase_order_mismatch");

    const requiredContacts = contract.setup?.feet?.requiredContacts || [];
    if (contract.setup?.feet?.hardFail) {
      for (const phase of spec.phases || []) {
        if (!hasContacts(phase, requiredContacts)) failures.push(`missing_required_contact:${phase.id}`);
      }
    }
    if (contract.setup?.feet?.flightPermitted === false) {
      for (const phase of spec.phases || []) {
        if (phase.flight === true || phase.kind === "airborne" || phase.kind === "flight") failures.push(`flight_not_permitted:${phase.id}`);
      }
    }

    const start = (spec.phases || []).find(phase => phase.id === "start");
    const bottom = (spec.phases || []).find(phase => phase.id === "bottom");
    const finish = (spec.phases || []).find(phase => phase.id === "finish");
    if (contract.hardConstraints?.includes("pelvis_descends_during_descent") && !(bottom?.root?.positionOffset?.[1] < (start?.root?.positionOffset?.[1] ?? 0))) failures.push("pelvis_descent_missing");
    if (contract.hardConstraints?.includes("return_to_stable_standing") && JSON.stringify(finish?.root?.positionOffset || []) !== JSON.stringify(start?.root?.positionOffset || [])) failures.push("finish_root_not_restored");

    return freeze({ valid: failures.length === 0, failures: freeze(failures) });
  }

  function evaluatePoseSample(sample, contract) {
    const checks = [];
    const target = contract?.numericalTargets?.insideKneeAngleDegrees;
    const footLimit = Number(contract?.numericalTargets?.footAnchorResidual?.hardFailAbove);
    const kneeAngle = Number(sample?.insideKneeAngleDegrees);
    const footResidual = Math.max(Number(sample?.leftFootResidual || 0), Number(sample?.rightFootResidual || 0));

    if (sample?.phaseId === "bottom" && Number.isFinite(kneeAngle) && target) {
      const error = Math.abs(kneeAngle - Number(target.bottomTarget));
      checks.push(freeze({ id: "bottom_knee_angle", pass: error <= Number(target.bottomEngineeringToleranceDegrees), actual: kneeAngle, target: target.bottomTarget, tolerance: target.bottomEngineeringToleranceDegrees }));
    }
    if (Number.isFinite(footLimit)) checks.push(freeze({ id: "dual_foot_anchor", pass: footResidual <= footLimit, actual: footResidual, max: footLimit }));
    if (sample?.heelRise === true) checks.push(freeze({ id: "heel_rise", pass: false }));
    if (sample?.kneeValgus === true) checks.push(freeze({ id: "knee_valgus", pass: false }));
    if (sample?.asymmetricWeightShift === true) checks.push(freeze({ id: "asymmetric_weight_shift", pass: false }));
    if (sample?.pelvisDirection === "up" && sample?.phaseId === "descent") checks.push(freeze({ id: "pelvis_descent_direction", pass: false }));

    return freeze({ valid: checks.every(check => check.pass !== false), checks: freeze(checks) });
  }

  return freeze({ preflight, evaluatePoseSample });
});

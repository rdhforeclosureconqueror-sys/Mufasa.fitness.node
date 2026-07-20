const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const wizard = require("../public/retention-journey-wizard.js");
const { createUserStore } = require("../src/repositories/userStore");
const { createJourneyIntakeService } = require("../src/services/journeyIntakeService");

function intake() {
  const store = createUserStore({ userDir: fs.mkdtempSync(path.join(os.tmpdir(), "wizard-")) });
  return createJourneyIntakeService({ userStore: store }).get("wizard-test").intake;
}

test("wizard resumes the stored current step and restores structured controls", () => {
  const r = intake();
  r.currentStep = "goals";
  r.goals.primaryGoal = "Build strength";
  r.goals.secondaryGoals = ["strength", "mobility"];
  let html = wizard.renderStep(r, r.currentStep);
  assert.match(html, /value="Build strength"/);
  assert.match(html, /value="strength" checked/);
  assert.match(html, /value="mobility" checked/);
  r.currentStep = "health_safety";
  r.healthSafety.receivingTreatmentOrRehab = true;
  r.healthSafety.believesExerciseIsSafe = "unsure";
  html = wizard.renderStep(r, r.currentStep);
  assert.match(html, /value="true" selected/);
  assert.match(html, /value="unsure" selected/);
});

test("pathway selection is capped and safely reassigns primary", () => {
  assert.deepEqual(wizard.normalizePathway({ selected: ["general_fitness", "yoga_wellness", "athlete_performance"], primary: "athlete_performance" }), { selected: ["general_fitness", "yoga_wellness"], primary: null });
  assert.deepEqual(wizard.normalizePathway({ selected: ["yoga_wellness"], primary: "general_fitness" }), { selected: ["yoga_wellness"], primary: "yoga_wellness" });
  assert.equal(wizard.LIMITS["goals.secondaryGoals"], 3);
  assert.equal(wizard.LIMITS["athletePerformance.performancePriorities"], 3);
});

test("Step 1 derives primary choices for one and two selected pathways", () => {
  const r = intake();
  r.pathwaySelection = wizard.normalizePathway({ selected: ["yoga_wellness"] });
  let html = wizard.renderStep(r, "pathway_selection");
  assert.match(html, /name="journeyPrimary" value="yoga_wellness" checked/);
  assert.doesNotMatch(html, /Select a pathway first/);
  r.pathwaySelection = wizard.normalizePathway({ selected: ["yoga_wellness", "athlete_performance"], primary: "yoga_wellness" });
  html = wizard.renderStep(r, "pathway_selection");
  assert.match(html, /value="yoga_wellness" checked/);
  assert.match(html, /value="athlete_performance"/);
});

test("Step 1 validation is specific and removing a primary follows product rules", () => {
  assert.deepEqual(wizard.validatePathwaySelection({ selected: [], primary: null }), { "pathwaySelection.selected": "Choose at least one pathway." });
  assert.deepEqual(wizard.validatePathwaySelection({ selected: ["yoga_wellness", "athlete_performance"], primary: null }), { "pathwaySelection.primary": "Choose a primary pathway." });
  assert.deepEqual(wizard.validatePathwaySelection({ selected: ["yoga_wellness", "athlete_performance"], primary: "athlete_performance" }), {});
  assert.deepEqual(wizard.normalizePathway({ selected: ["yoga_wellness"], primary: "athlete_performance" }), { selected: ["yoga_wellness"], primary: "yoga_wellness" });
  assert.deepEqual(wizard.normalizePathway({ selected: ["yoga_wellness", "general_fitness"], primary: "athlete_performance" }), { selected: ["yoga_wellness", "general_fitness"], primary: null });
});

test("conditional pathway sections and Rugby visibility preserve stored answers", () => {
  const r = intake();
  r.pathwaySelection = { selected: ["general_fitness", "yoga_wellness"], primary: "general_fitness" };
  let html = wizard.renderStep(r, "pathway_details");
  assert.match(html, /General Fitness/); assert.match(html, /Yoga & Wellness/); assert.doesNotMatch(html, /Athlete Performance/);
  r.pathwaySelection = { selected: ["athlete_performance"], primary: "athlete_performance" };
  r.athletePerformance.sport = "Rugby"; r.rugbySupplement.primaryPosition = "wing";
  html = wizard.renderStep(r, "pathway_details");
  assert.match(html, /Athlete Performance/); assert.match(html, /Rugby supplement/); assert.match(html, /value="wing"/);
  r.athletePerformance.sport = "Soccer";
  html = wizard.renderStep(r, "pathway_details");
  assert.doesNotMatch(html, /Rugby supplement/); assert.equal(r.rugbySupplement.primaryPosition, "wing");
});

test("wizard markup provides associated errors, focus targets, groups and navigation", () => {
  const r = intake(); r.pathwaySelection = { selected: ["general_fitness"], primary: "general_fitness" };
  const goals = wizard.renderStep(r, "goals");
  assert.match(goals, /fieldset/); assert.match(goals, /legend/); assert.match(goals, /aria-describedby="rjw-goals-secondaryGoals-error"/); assert.match(goals, /id="rjw-step-heading" tabindex="-1"/);
  const source = fs.readFileSync(path.join(__dirname, "../public/retention-journey-wizard.js"), "utf8");
  assert.match(source, /Unsaved changes/); assert.match(source, /Saving…/); assert.match(source, /Save failed/); assert.match(source, /queue\.then/); assert.match(source, /mine !== sequence/);
  assert.doesNotMatch(source, /if \(busy\) return pending/); assert.match(source, /if\(advancing\)return/);
  assert.match(source, />Previous</); assert.match(source, /Save &amp; Continue/); assert.match(source, /\[aria-invalid=true\]/);
});

test("submitted views use member-safe language and no raw health enums", () => {
  const source = fs.readFileSync(path.join(__dirname, "../public/retention-journey-wizard.js"), "utf8");
  assert.match(source, /Intake submitted/); assert.match(source, /Do not begin testing or strenuous activity/); assert.match(source, /not a diagnosis or automatic clearance/); assert.match(source, /Review submitted answers/);
  assert.doesNotMatch(source, /CURRENT_PAIN_OR_INJURY|MEDICAL_CLEARANCE_REQUIRED/);
});

test("server validation detail shapes map to fields and sections", () => {
  assert.deepEqual(wizard.mapServerErrors({ message: "invalid date", details: { field: "profile.dateOfBirth" } }), { "profile.dateOfBirth": "invalid date" });
  assert.deepEqual(wizard.mapServerErrors({ details: { fields: ["goals", "schedule"] } }), { goals: "Complete this section before submitting.", schedule: "Complete this section before submitting." });
  assert.deepEqual(wizard.mapServerErrors({ details: { issues: [{ path: ["goals", "primaryGoal"], message: "Required" }] } }), { "goals.primaryGoal": "Required" });
});

test("Universal Intake is isolated from comma-separated legacy intake", () => {
  const flow = fs.readFileSync(path.join(__dirname, "../public/retention-flow.js"), "utf8");
  const source = fs.readFileSync(path.join(__dirname, "../public/retention-journey-wizard.js"), "utf8");
  assert.equal((flow.match(/RetentionJourneyWizard\.create/g) || []).length, 1);
  assert.doesNotMatch(source, /comma-separated/i);
  assert.match(flow, /retired client-intake forms/);
});

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Canonical repository sources are returned verbatim (and bounded), rather than
// replaced by a model-facing architecture summary.
const ARCHITECTURE_SOURCES = Object.freeze([
  "docs/architecture/ai-business-os/PHASE_1_CONSTITUTIONAL_KERNEL.md",
  "docs/architecture/ai-business-os/PHASE_2_MODEL_GATEWAY_AND_COGNITIVE_CORE.md",
  "docs/architecture/ai-business-os/PHASE_3_MEMORY_KNOWLEDGE_CONTEXT.md",
  "docs/architecture/ai-business-os/PHASE_4_TOOL_CAPABILITY_PLANNING_EXECUTION.md",
  "docs/architecture/ai-business-os/PHASE_5_SHARED_AGENT_RUNTIME.md",
  "docs/architecture/ai-business-os/PHASE_6_ORGANIZATIONAL_INTELLIGENCE_ROLES.md",
  "docs/architecture/ai-business-os/PHASE_7_BRAIN_ACADEMY_AND_CERTIFICATION.md",
  "docs/architecture/ai-business-os/PHASE_8_CLOSED_WORLD_ORGANISM_SIMULATION.md",
  "docs/architecture/ai-business-os/PHASE_9_THIN_BODY_REAL_WORLD_ORGANISM.md",
  "docs/architecture/ai-business-os/PHASE_9B_A_CONTROLLED_LIVE_ORGANISM.md",
  "docs/architecture/ai-business-os/COMMAND_CENTER_AND_COMMAND_INTELLIGENCE.md",
  "docs/architecture/ai-business-os/economics/README.md"
]);

function createArchitectureEvidenceReader({root = path.resolve(__dirname, "../../.."), maxCharacters = 36000} = {}) {
  return () => {
    let remaining = maxCharacters;
    return ARCHITECTURE_SOURCES.map(source => {
      const absolute = path.join(root, source);
      if (!fs.existsSync(absolute) || remaining <= 0) return null;
      const content = fs.readFileSync(absolute, "utf8").slice(0, Math.min(remaining, 3000));
      remaining -= content.length;
      return {source, evidenceKind: "ARCHITECTURE", content};
    }).filter(Boolean);
  };
}

module.exports = {ARCHITECTURE_SOURCES, createArchitectureEvidenceReader};

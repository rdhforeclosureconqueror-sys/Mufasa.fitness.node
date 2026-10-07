"use strict";

const DIMENSIONS = Object.freeze({
  GR: { name: "Grounding / Regulation", bowl: "C", chakra: "Root", element: "Earth" },
  EF: { name: "Emotional Flow", bowl: "D", chakra: "Sacral", element: "Water" },
  AG: { name: "Agency / Energy", bowl: "E", chakra: "Solar Plexus", element: "Fire" },
  CO: { name: "Connection / Openness", bowl: "F", chakra: "Heart", element: "Air" },
  EX: { name: "Expression", bowl: "G", chakra: "Throat", element: "Space" },
  CL: { name: "Clarity / Insight", bowl: "A", chakra: "Third Eye", element: "Mind / Light" },
  SP: { name: "Spiritual / Meaning Connection", bowl: "B", chakra: "Crown", element: "Beyond elements" },
});
const ACTIVATION_STATES = Object.freeze(["UNDERACTIVATED", "REGULATED", "OVERACTIVATED"]);
const BOWLS = Object.freeze([
  { note:"C", dimension:"GR", chakra:"Root", element:"Earth", bija:"LAM" },
  { note:"D", dimension:"EF", chakra:"Sacral", element:"Water", bija:"VAM" },
  { note:"E", dimension:"AG", chakra:"Solar Plexus", element:"Fire", bija:"RAM" },
  { note:"F", dimension:"CO", chakra:"Heart", element:"Air", bija:"YAM" },
  { note:"G", dimension:"EX", chakra:"Throat", element:"Space", bija:"HAM" },
  { note:"A", dimension:"CL", chakra:"Third Eye", element:"Mind / Light", bija:"OM" },
  { note:"B", dimension:"SP", chakra:"Crown", element:"Beyond elements", bija:"SILENCE / OM" },
]);
module.exports={DIMENSIONS,ACTIVATION_STATES,BOWLS};
import test from "node:test";
import assert from "node:assert/strict";
import { calculateRisk } from "./riskModel.js";

const baseline = {
  mode: "space",
  target: "tibia",
  mass: 40,
  speed: 22,
  angle: 62,
  contactArea: 14,
  boneIndex: 0.82,
  microgravityDays: 180,
  fatigue: 0.48,
};

test("higher impact speed increases the risk score", () => {
  const low = calculateRisk({ ...baseline, speed: 12 });
  const high = calculateRisk({ ...baseline, speed: 40 });

  assert.ok(high.score > low.score);
  assert.ok(high.kineticEnergy > low.kineticEnergy);
});

test("smaller contact area increases stress density", () => {
  const broad = calculateRisk({ ...baseline, contactArea: 80 });
  const sharp = calculateRisk({ ...baseline, contactArea: 2 });

  assert.ok(sharp.energyDensity > broad.energyDensity);
  assert.ok(sharp.score > broad.score);
});

test("microgravity exposure increases space-mode fragility", () => {
  const shortMission = calculateRisk({ ...baseline, microgravityDays: 0 });
  const longMission = calculateRisk({ ...baseline, microgravityDays: 240 });

  assert.ok(longMission.fragility > shortMission.fragility);
  assert.ok(longMission.spaceLoss > shortMission.spaceLoss);
});

test("sports fatigue affects sport mode but not space mode", () => {
  const restedSport = calculateRisk({ ...baseline, mode: "sport", microgravityDays: 0, fatigue: 0 });
  const fatiguedSport = calculateRisk({ ...baseline, mode: "sport", microgravityDays: 0, fatigue: 1 });
  const spaceFatigue = calculateRisk({ ...baseline, mode: "space", fatigue: 1 });
  const spaceRested = calculateRisk({ ...baseline, mode: "space", fatigue: 0 });

  assert.ok(fatiguedSport.fragility > restedSport.fragility);
  assert.equal(spaceFatigue.fragility, spaceRested.fragility);
});

test("sharp high-speed edge case is marked as needing lab validation", () => {
  const paperEdge = calculateRisk({
    ...baseline,
    mass: 5,
    speed: 82,
    contactArea: 2,
  });

  assert.equal(paperEdge.confidence, "Needs lab validation");
});

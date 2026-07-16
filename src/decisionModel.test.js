import test from "node:test";
import assert from "node:assert/strict";
import { calculateDecision, fragilityToScore } from "./decisionModel.js";

test("decision remains incomplete when imaging evidence is missing", () => {
  const decision = calculateDecision({
    physicsScore: 58,
    fragility: 1.25,
  });

  assert.equal(decision.sourceCount, 2);
  assert.equal(decision.imagingScore, null);
  assert.match(decision.uncertainty, /imaging missing/i);
  assert.match(decision.recommendation, /do not delay/i);
});

test("strong imaging evidence raises the combined review priority", () => {
  const withoutImaging = calculateDecision({
    physicsScore: 60,
    fragility: 1.3,
  });
  const withImaging = calculateDecision({
    physicsScore: 60,
    fragility: 1.3,
    aiLoaded: true,
    fractureProbability: 0.99,
  });

  assert.ok(withImaging.score > withoutImaging.score);
  assert.equal(withImaging.band.key, "high");
  assert.equal(withImaging.sourceCount, 3);
});

test("large disagreement between image and physics widens uncertainty", () => {
  const decision = calculateDecision({
    physicsScore: 8,
    fragility: 0.9,
    aiLoaded: true,
    fractureProbability: 0.96,
  });

  assert.match(decision.uncertainty, /sources disagree/i);
});

test("fragility score is bounded for the user interface", () => {
  assert.equal(fragilityToScore(0.4), 0);
  assert.equal(fragilityToScore(4), 100);
});

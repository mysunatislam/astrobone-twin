const DEFAULT_WEIGHTS = {
  imaging: 0.45,
  impact: 0.35,
  fragility: 0.2,
};

export function calculateDecision({
  physicsScore,
  fragility,
  aiLoaded = false,
  fractureProbability = 0,
  physicsConfidence = "Prototype",
}) {
  const impactScore = clamp(Number(physicsScore) || 0, 0, 100);
  const fragilityScore = fragilityToScore(fragility);
  const imagingScore = aiLoaded
    ? clamp((Number(fractureProbability) || 0) * 100, 0, 100)
    : null;

  const score = aiLoaded
    ? (
      imagingScore * DEFAULT_WEIGHTS.imaging
      + impactScore * DEFAULT_WEIGHTS.impact
      + fragilityScore * DEFAULT_WEIGHTS.fragility
    )
    : impactScore * 0.72 + fragilityScore * 0.28;

  const roundedScore = Math.round(clamp(score, 0, 100));
  const band = getDecisionBand(roundedScore);
  const sourceCount = aiLoaded ? 3 : 2;
  const disagreement = aiLoaded ? Math.abs(imagingScore - impactScore) : null;
  const uncertainty = getUncertainty({
    aiLoaded,
    disagreement,
    physicsConfidence,
  });

  return {
    score: roundedScore,
    band,
    sourceCount,
    completeness: sourceCount / 3,
    uncertainty,
    imagingScore,
    impactScore,
    fragilityScore,
    recommendation: getRecommendation(band, aiLoaded),
    rationale: getRationale({
      band,
      aiLoaded,
      imagingScore,
      impactScore,
      fragilityScore,
    }),
  };
}

export function fragilityToScore(fragility) {
  const normalized = ((Number(fragility) || 0.82) - 0.82) / 1.08;
  return Math.round(clamp(normalized * 100, 0, 100));
}

function getDecisionBand(score) {
  if (score >= 72) {
    return {
      key: "high",
      label: "High review priority",
      title: "The evidence supports immediate expert review",
    };
  }
  if (score >= 42) {
    return {
      key: "watch",
      label: "Review needed",
      title: "The scenario needs mitigation or stronger evidence",
    };
  }
  return {
    key: "low",
    label: "Monitor",
    title: "No strong combined warning in this scenario",
  };
}

function getUncertainty({ aiLoaded, disagreement, physicsConfidence }) {
  if (!aiLoaded) return "Wide - imaging missing";
  if (physicsConfidence === "Needs lab validation") return "Wide - physics edge case";
  if (disagreement >= 45) return "Wide - sources disagree";
  return "Moderate - prototype models";
}

function getRecommendation(band, aiLoaded) {
  if (!aiLoaded) {
    return "Collect image evidence if available, but do not delay the condition check or an approved response when warning signs are present.";
  }
  if (band.key === "high") {
    return "Open the response plan, protect the limb from further loading, and prepare a qualified medical handoff.";
  }
  if (band.key === "watch") {
    return "Lower controllable loading, log a follow-up observation, and gather stronger evidence for assisted review.";
  }
  return "Record a baseline, continue monitoring, and compare future condition or load data against it.";
}

function getRationale({
  band,
  aiLoaded,
  imagingScore,
  impactScore,
  fragilityScore,
}) {
  const strongest = [
    { label: "X-ray evidence", score: imagingScore },
    { label: "Impact demand", score: impactScore },
    { label: "Bone fragility", score: fragilityScore },
  ]
    .filter((source) => source.score !== null)
    .sort((a, b) => b.score - a.score)[0];

  if (!aiLoaded) {
    return "Impact and fragility are estimated, but structural image evidence is still missing.";
  }

  return `${strongest.label} is the strongest contributor. The combined result is classified as ${band.label.toLowerCase()}.`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const TARGET_META = {
  tibia: { label: "Tibia shaft", site: 1.22 },
  femur: { label: "Femur shaft", site: 1.02 },
  knee: { label: "Knee joint", site: 1.14 },
  ankle: { label: "Ankle joint", site: 0.96 },
};

export function calculateRisk(inputs) {
  const target = TARGET_META[inputs.target] ? inputs.target : "tibia";
  const massKg = inputs.mass / 1000;
  const kineticEnergy = 0.5 * massKg * inputs.speed * inputs.speed;
  const angleRad = degToRad(inputs.angle);
  const normalComponent = Math.sin(angleRad);
  const effectiveEnergy = kineticEnergy * (0.22 + normalComponent * 0.78);
  const energyDensity = effectiveEnergy / Math.max(1, inputs.contactArea);
  const spaceLoss = inputs.mode === "space"
    ? Math.min(0.3, (inputs.microgravityDays / 30) * 0.0125)
    : 0;
  const sportFatigue = inputs.mode === "sport" ? inputs.fatigue * 0.22 : 0;
  const densityPenalty = Math.max(0, 1 - inputs.boneIndex) * 1.9;
  const fragility = 0.82 + densityPenalty + spaceLoss * 2.35 + sportFatigue;
  const siteModifier = TARGET_META[target].site;
  const rawScore = (
    energyDensity * 52
    + effectiveEnergy * 0.34
    + Math.max(0, inputs.speed - 8) * 1.06
  ) * fragility * siteModifier;
  const score = clamp(rawScore, 0, 100);
  const status = score >= 72 ? "High risk" : score >= 42 ? "Watch zone" : "Low risk";
  const confidence = inputs.contactArea <= 3 || inputs.speed > 80
    ? "Needs lab validation"
    : "Prototype";

  return {
    kineticEnergy,
    effectiveEnergy,
    energyDensity,
    normalComponent,
    fragility,
    siteModifier,
    score,
    status,
    confidence,
    spaceLoss,
  };
}

export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

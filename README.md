# AstroBone Twin

AstroBone Twin is a prototype digital twin for explainable fracture-risk simulation. It combines:

- Live demo: https://mysunatislam.github.io/astrobone-twin/
- Public repo: https://github.com/mysunatislam/astrobone-twin
- A rigged human skeleton with an articulated procedural fallback built with Three.js
- Scenario-specific 3D impact objects, including a thin, curled paper checklist, EVA tool, and foot-strike proxy
- Impact controls for mass, speed, angle, contact area, bone strength, and target region
- Space and sport modes
- A visible load path, stress hotspot, microcrack indicator, and timeline of the impact process
- DenseNet121 fracture classification and U-Net++ fracture-mask evidence
- A guided scan, event, crew-condition, and response workflow
- A transparent decision layer that keeps image evidence, impact demand, fragility, and uncertainty separate
- A separate operational care-priority model using pain, swelling, limb use, and sensation
- A checkable response plan, follow-up observation log, and exportable medical handoff packet
- A local chatbot-style assistant that explains the current scenario and recommended next step

This is a risk-estimation demo, not a diagnostic or medical device.

## Contributors

- Sairah Nuva / @mysunatislam - project concept, research direction, prototype build, dataset preparation, and demo ownership

## Problem And Solution

The problem is that the same applied load can have a different consequence when bone reserve,
impact geometry, and access to definitive evaluation change. Spaceflight adds reduced skeletal
loading and remote-care constraints; sport adds repetitive loading, fatigue, and incomplete
recovery.

AstroBone's proposed solution is an explainable digital twin that:

1. Screens a planned task or repeated-load scenario before exposure.
2. Connects image evidence when it is available.
3. Reconstructs the impact and estimates skeletal reserve.
4. Uses reported condition to set operational urgency without altering the image probability.
5. Produces a protocol-linked response checklist, trend log, and medical handoff packet.

## Why This Fits The NASA Hook

NASA's public human research material frames fracture risk as a combination of applied loads and
skeletal fragility. NASA's Exploration Medical Capability work also emphasizes progressively
Earth-independent clinical decision support as communication delay, evacuation limits, and resource
constraints increase. AstroBone now connects both ideas: fracture-risk evidence plus an onboard
prevention-to-handoff workflow.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Verify

```bash
npm test
npm run build
```

The impact model is separated into `src/riskModel.js`, and the evidence-fusion layer is separated
into `src/decisionModel.js`. Operational urgency and response actions are separated into
`src/carePlan.js`, so symptoms cannot silently alter the fracture model.

The current fusion score is a transparent research heuristic, not a calibrated fracture
probability.

## Research Docs

- `docs/research-roadmap.md` - phased plan from prototype to research-grade digital twin
- `docs/literature-map.md` - NASA, biomechanics, sports, and Simscape sources to study
- `docs/modeling-stack.md` - web, Python, Simscape, FEA, and chatbot architecture
- `docs/dataset-plan.md` - public datasets for deep learning and training roadmap
- `docs/space-bone-datasets.md` - NASA/spaceflight bone datasets and how to use them
- `docs/crew-operations-workflow.md` - prevention, response, monitoring, and handoff design

## MATLAB/Simulink Track

The generated Simulink control setup lives in `simulink/`.

In MATLAB, run:

```matlab
setupAstroBonePath
validateAstroBoneMatlabSetup
modelFile = buildAstroBoneControlModel
simOut = sim("AstroBone_Control")
```

The first model is a Level-A control envelope: impact pulse, contact stress/strain estimate, fragility model, risk logic, mitigation controller, and export signals. It is designed so a future Simscape Multibody contact model can replace the current impact block.

## Deep Learning Track

The training pipeline lives in `ml/`.

Start with dataset splits:

```bash
python -m ml.scripts.prepare_fracatlas --dataset-root data/raw/fracatlas
```

Then train:

```bash
python -m ml.scripts.train_classifier --config ml/configs/classifier_densenet121.yaml
python -m ml.scripts.train_segmentation --config ml/configs/segmentation_unetpp_densenet121.yaml
```

Use `requirements-ml.txt` if the ML packages are missing on another machine.

## Strong Next Steps

1. Replace the procedural anatomy with a licensed or open CT-derived lower-limb mesh.
2. Add an uncertainty model instead of a single score.
3. Connect sports mode to training-load and wearable acceleration data.
4. Add a written validation page with assumptions, equations, and source links.
5. Prepare a NASA Space Apps demo video focused on explainability, not diagnosis.

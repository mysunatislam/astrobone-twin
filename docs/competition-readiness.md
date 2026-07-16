# AstroBone Competition Readiness

## Positioning

AstroBone should be presented as an onboard musculoskeletal decision-support prototype, not as an autonomous diagnostic system. The strongest story is:

Problem: exploration crews can face reduced skeletal reserve, small high-speed impacts, delayed imaging, and delayed specialist support.

Solution: a digital twin that links event mechanics, AI image evidence, bone fragility, crew condition, response actions, monitoring, and a handoff packet.

## Required Submission Assets

1. Official challenge mapping
   - Choose one official challenge track before submission.
   - Explain why AstroBone directly answers that challenge.
   - Avoid relying on a custom challenge if the competition does not judge custom entries globally.

2. Public final project link
   - Hosted app or public repository.
   - Clear setup instructions.
   - Publicly accessible without login.

3. Demo
   - 30-second video or seven-slide deck.
   - First 5 seconds: name the problem.
   - Next 10 seconds: show the 3D twin and paper-edge scenario.
   - Next 10 seconds: show AI evidence, uncertainty, and response plan.
   - Final 5 seconds: show exported handoff and future validation path.

4. Data and AI disclosure
   - FracAtlas use, split method, class balance, limitations.
   - DenseNet121 classifier metrics.
   - U-Net++ segmentation metrics.
   - Clear statement that AI assisted code/data preparation was used if applicable.

5. NASA/open-data connection
   - Add NASA Human Research Program bone-health citations.
   - Add any NASA or space-agency data that inspired assumptions.
   - Explain how open data affects the design, not just decoration.

## Current Strengths

- Working Three.js skeleton digital twin.
- Paper-edge impact scenario with live mechanics controls.
- FracAtlas classifier and segmenter prototype pipeline.
- Explainable risk factors: mass, speed, contact area, impact angle, bone reserve, microgravity exposure, symptoms.
- Response workflow beyond detection: protect, assess, open protocol, monitor, relay.
- JSON exports for medical handoff and competition brief.

## Gaps To Close

1. Validation
   - Add formula references and units for kinetic energy, normal component, contact stress proxy, and fragility.
   - Compare several hand-calculated examples against the UI.
   - Add Simscape or finite-element validation case later.

2. Spaceflight evidence
   - Cite NASA bone-loss and fracture-risk research.
   - Distinguish real astronaut bone-health data from proxy X-ray datasets.
   - Add uncertainty warnings for population mismatch.

3. Model cards
   - Document intended use, non-use, metrics, limitations, training split, and failure modes.
   - Include examples of false positives and false negatives.

4. User experience
   - Keep the first screen focused on one scenario.
   - Keep the paper visible as a thin sheet, not a tool.
   - Keep every decision tied to a next action.

5. Storytelling
   - Lead with prevention and delayed care, not only fracture detection.
   - Show how the system helps people: screen before risk, assess after event, avoid unnecessary load, package evidence for review.

## Suggested Next Build Order

1. Add a validation page inside the app.
2. Add model-card and dataset-card views.
3. Add citations and paper links to the competition brief.
4. Create the 30-second demo script.
5. Publish a hosted version and public repository.

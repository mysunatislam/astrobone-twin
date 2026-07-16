# Crew Operations Workflow

AstroBone should not stop at "fracture detected." For a space traveler, the useful product is a
continuity-of-care workflow that remains understandable when ground communication is delayed.

## Operational Problem

Exploration crews may face:

- Reduced access to evacuation and resupply
- Communication delay or temporary loss of ground support
- Limited crew medical time, training, equipment, and consumables
- Skeletal changes after prolonged unloading
- A need to preserve a clean record for later flight-surgeon review

## How AstroBone Helps

### 1. Prevent

Before an EVA, exercise session, or maintenance task, simulate:

- Loose-object or tool impact
- Target anatomy
- Speed, angle, mass, and contact area
- Current bone-strength assumptions

The output should identify controllable variables, not simply display a red score.

### 2. Assess

After an event, combine four evidence groups:

- Image evidence
- Impact or repeated-load reconstruction
- Skeletal reserve
- Reported condition and limb function

Image probability, mechanical demand, and operational urgency must remain separate outputs.

### 3. Respond

Turn urgency into checkable actions:

- Protect the affected limb from further loading
- Record the crew condition and event time
- Open the authorized medical protocol
- Track which response actions were completed
- Prepare a handoff for qualified medical support

AstroBone must never invent treatment. Operational deployment requires approved procedures and
medical oversight.

### 4. Monitor

Store repeated observations of:

- Pain
- Swelling
- Limb use
- Sensation changes
- Combined signal and impact demand
- Completed response actions

Trend direction is more useful than one isolated model result.

### 5. Relay

Export one compact packet containing:

- Scenario inputs
- Image-model result and warning
- Physics outputs
- Decision score and uncertainty
- Crew-condition observations
- Response priority and completed actions
- Model limitations

This packet can support delayed review without pretending the software is a flight surgeon.

## NASA Alignment

- NASA Exploration Medical Capability CDSS architecture:
  https://ntrs.nasa.gov/citations/20220017869
- NASA Earth-independent medical operations:
  https://ntrs.nasa.gov/citations/20230003307
- NASA clinical decision support overview:
  https://www.nasa.gov/centers-and-facilities/ames/ames-science/ames-space-biosciences/a-clinical-decision-support-system-for-earth-independent-medical-operations/
- NASA exploration medical technologies:
  https://www.nasa.gov/glenn/glenn-expertise-space-exploration/human-health-performance/exploration-medical-technologies/

These sources support the product direction: continuously gathered medical data, real-time
guidance, increasing crew autonomy, integrated records, and preserved access to qualified medical
review.

## Validation Gates

Before any operational claim:

1. Replace the response text with flight-surgeon-approved protocols.
2. Validate the symptom-to-urgency rules with aerospace medicine experts.
3. Add authentication, audit history, privacy controls, and encrypted storage.
4. Validate offline behavior and delayed synchronization.
5. Connect actual onboard imaging, sensors, and medical inventory.
6. Test workload and usability in a crew analog environment.

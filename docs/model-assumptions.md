# AstroBone Level-A Model Assumptions

Status: analytical research model v1  
Date: 2026-07-22

## Purpose

The Level-A model is a fast, explainable screening calculation for scenario comparison. It is designed to establish correct units and directional behavior before Simscape, finite-element, benchtop, or clinical validation.

## Mechanics

The angle is measured from the local surface plane. Therefore, 0 degrees is tangential and 90 degrees is normal.

```text
v_n = v * sin(theta)
E_k = 0.5 * m * v^2
E_normal = 0.5 * m * v_n^2
J = m * v_n
F_average = J / delta_t
sigma = F_average / A
epsilon = sigma / E_bone
```

Unit conversions are explicit:

```text
grams -> kilograms:      g / 1000
milliseconds -> seconds: ms / 1000
square millimeters -> m2: mm2 * 1e-6
gigapascals -> pascals:  GPa * 1e9
megapascals -> pascals:  MPa * 1e6
```

The impulse calculation assumes that the normal velocity is arrested during the chosen contact pulse with no rebound. The result is an average force, not a peak force.

## Capacity

```text
C_adjusted = C_0 * S_microgravity * S_site * S_person * S_sport
S_microgravity = 1 - min(months * monthly_loss_rate, maximum_loss)
DCR = contact_stress / C_adjusted
```

For the frozen tibia/space scenario, `S_site = 1` and `S_sport = 1`. `S_person` is the normalized bone reserve index supplied to the model.

NASA's public 1%-1.5% monthly figure describes average mineral-density loss in weight-bearing bone. The v1 model temporarily applies that fraction as a capacity modifier. This is a translational approximation, not evidence that density and strength decrease one-for-one.

## Research Bands

| DCR | Label |
| ---: | --- |
| `< 0.50` | Lower relative concern |
| `0.50 to < 0.80` | Monitor |
| `0.80 to < 1.00` | Elevated relative concern |
| `>= 1.00` | Potential capacity exceedance |

These are research thresholds for scenario comparison. They are not clinical cutoffs and are not mapped to fracture probability.

## Material Assumptions

- Bone is homogeneous and linear elastic.
- The modulus is scalar even though cortical bone is anisotropic.
- Baseline capacity is a nominal tissue-level stress scale.
- The same nominal capacity is used for tension, compression, shear, and bending in v1.
- Geometry, cortical thickness, trabecular structure, defects, age, sex, and remodeling history are not resolved.

## Contact Assumptions

- The selected area is a uniform effective contact patch.
- Soft tissue, suit material, padding, tool compliance, and local curvature are not modeled.
- Force is distributed uniformly; local peak stress and stress concentration are omitted.
- A direct normal impulse is used; bending moment, torsion, axial load transfer, and joint constraints are omitted.
- Impact duration is an uncertain input and is expected to dominate many scenarios.

NASA has measured EVA-suit impact attenuation as a source of uncertainty in fracture prediction. That attenuation is deliberately excluded from v1 until a separate suit/contact factor is validated: https://ntrs.nasa.gov/citations/20110011355

## Scope Warnings

The implementation warns when:

- the selected anatomy is not the tibia
- sports mode is used
- any value falls outside the initial research range

Out-of-range inputs still calculate when they are physically valid so existing demonstrations can be explored, but their model status is displayed as outside the frozen scope. Negative mass or speed, non-positive area/duration/material values, invalid angles, and non-finite values are rejected.

## Interpretation Boundary

Valid statement:

> Under the stated assumptions, this scenario has a higher DCR than the baseline because normal speed increased and adjusted capacity decreased.

Invalid statement:

> This astronaut has a 68% chance of fracture.

## Sources

- NASA formal fracture-risk record: https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/
- NASA BFxRM sensitivity analysis: https://ntrs.nasa.gov/citations/20170005223
- Human tibial cortical-bone modulus anisotropy: https://pubmed.ncbi.nlm.nih.gov/10912351/
- Human cortical-bone post-yield and failure properties: https://pmc.ncbi.nlm.nih.gov/articles/PMC4996317/
- Human tibia dynamic fracture behavior: https://pubmed.ncbi.nlm.nih.gov/8939012/


# Phase 2.3 — visual input ablation

Status: COMPLETE. Same period-8 phase2-v1 environment, user-confirmed correction from requested period14. Immediate attribution only; does not exclude earlier risk-management errors. Hidden images omit robot AND vision. Current images alone supplied, text memory only model-owned outputs.

| Condition | Input | Pass | Player perception | Visible flag | Visible robot joint | Visible prediction | Occluded prediction | Format | Perception | Prediction | Planning | Requests | RMB |
|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| Omniscient-Vision | Text baseline | 4/4 | N/A | N/A | N/A | 34/34 (100.0%) | N/A | 0 | 0 | 0 | 0 | 34 | 1.400466 |
| Omniscient-Vision | Current PNG + own history | 4/4 | 34/34 (100.0%) | 34/34 (100.0%) | 34/34 (100.0%) | 32/34 (94.1%) | N/A | 0 | 0 | 0 | 0 | 34 | 1.472166 |
| Partial-known-Vision | Text baseline | 4/4 | N/A | N/A | N/A | 4/4 (100.0%) | 30/30 (100.0%) | 0 | 0 | 0 | 0 | 34 | 1.500808 |
| Partial-known-Vision | Current PNG + own history | 3/4 | 29/29 (100.0%) | 29/29 (100.0%) | 4/4 (100.0%) | 4/4 (100.0%) | 25/25 (100.0%) | 0 | 0 | 0 | 1 | 29 | 1.391450 |

Vision total actual RMB: 2.863616. Text baseline RMB by condition: Omniscient-Vision 1.400466; Partial-known-Vision 1.500808. No new text-baseline calls. Incomplete/budget interruptions are not model failures.

## Prediction by hidden age

| Condition | Age1 | Age2 | Age3 | Age4+ |
|---|---|---|---|---|
| Omniscient-Vision | N/A | N/A | N/A | N/A |
| Partial-known-Vision | 4/4 (100.0%) | 4/4 (100.0%) | 4/4 (100.0%) | 13/13 (100.0%) |

## Immediate attribution (five subtypes / four classes)

- Omniscient-Vision: {"Format Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0,"Prediction Error":0,"Action/Planning Error":0}; four classes {"format":0,"perception":0,"prediction":0,"planning":0}.
- Partial-known-Vision: {"Format Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0,"Prediction Error":0,"Action/Planning Error":1}; four classes {"format":0,"perception":0,"prediction":0,"planning":1}.

## Failed episodes

- partial-known-vision-phase-0: Action/Planning Error (vision). [fatal input frame](partial-known-vision-phase-0/frames/tick-03.png)

## Perception error ticks

None.

Perception denominators exclude schema-invalid responses, which are separate Format Errors. Joint prediction requires both position and heading. Input visibility determines prediction strata; age resets at each actual legal sighting. Budget threshold is maxBudget minus 0.50 RMB; one already-dispatched call may consume part of this reserve. Static patrol rules and static GOAL coordinates are allowed; no live truth coordinates appear in request text.

## Failure reasoning and scope

- partial-known-vision-phase-0: perceived_current={"player_pos": [4, 3], "robot_visible": false, "robot_pos": null, "robot_heading": null}; predicted_next={"pos": [5, 4], "heading": "N"}; action=RIGHT. Model reason: Enter the opaque door at (5,3). The inferred robot stays at (5,4) and reverses north; the door blocks its forward vision.

The sole observed failure predicted the reversal correctly, then entered the northward vision ray at the crossing. The opaque door lies on the west edge of that crossing and does not block the robot-to-player ray along its patrol column. Under the requested schema this is Action/Planning Error. Perception scoring measures actor coordinates, heading and visibility; it does not separately test door/occlusion semantic interpretation. Four phases with one attempt each do not isolate a statistically significant modality effect.

[Verification](verification.json) · [Three previews](preview/) · [Implementation and reproduction](../../vision/README.md)

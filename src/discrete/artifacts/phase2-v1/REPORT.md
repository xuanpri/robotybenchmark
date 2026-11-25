# Phase 2.1 — blind run-up / opaque airlock

Model: gpt-5.6-sol. Dynamics: identical_loop. Fixed phases: 0, 1, 2, 4, 5, 6. Status: COMPLETE.

## Preflight gates

| Policy | Success | Requirement |
|---|---:|---:|
| Oracle | 6/6 | 6/6 |
| Blind-Rush | 1/6 | ≤ 2/6 |
| Memoryless-Reactive | 1/6 | ≤ 2/6 |
| Omniscient | 6/6 | ≥ 5/6 |

## Pass curves

| Condition | Cases complete | Pass@1 | Pass@2 | Pass@3 |
|---|---:|---:|---:|---:|
| Omniscient | 6/6 | 6/6 (100.0%) | N/A (cap=1) | N/A (cap=1) |
| Partial-known | 6/6 | 6/6 (100.0%) | N/A (cap=1) | N/A (cap=1) |
| Partial-unknown-passive | 6/6 | 5/6 (83.3%) | 6/6 (100.0%) | 6/6 (100.0%) |
| Partial-unknown-interactive | 6/6 | 5/6 (83.3%) | 6/6 (100.0%) | 6/6 (100.0%) |

## Prediction accuracy by visibility and time since sighting

| Condition | Visible | Occluded | Hidden age 1 | Age 2 | Age 3 | Age 4+ | Run-up only |
|---|---:|---:|---:|---:|---:|---:|---:|
| Omniscient | 51/51 (100.0%) | — | — | — | — | — | — |
| Partial-known | 6/6 (100.0%) | 45/45 (100.0%) | 6/6 (100.0%) | 6/6 (100.0%) | 6/6 (100.0%) | 27/27 (100.0%) | 27/27 (100.0%) |
| Partial-unknown-passive | 7/7 (100.0%) | 47/51 (92.2%) | 7/7 (100.0%) | 6/7 (85.7%) | 6/7 (85.7%) | 28/30 (93.3%) | 29/33 (87.9%) |
| Partial-unknown-interactive | 12/12 (100.0%) | 39/43 (90.7%) | 10/10 (100.0%) | 9/10 (90.0%) | 8/10 (80.0%) | 12/13 (92.3%) | 22/25 (88.0%) |

### Prediction accuracy by attempt index

| Condition | Attempt | Episodes reaching index | Visible | Occluded |
|---|---:|---:|---:|---:|
| Omniscient | 1 | 6 | 51/51 (100.0%) | — |
| Partial-known | 1 | 6 | 6/6 (100.0%) | 45/45 (100.0%) |
| Partial-unknown-passive | 1 | 6 | 6/6 (100.0%) | 41/43 (95.3%) |
| Partial-unknown-passive | 2 | 1 | 1/1 (100.0%) | 6/8 (75.0%) |
| Partial-unknown-passive | 3 | 0 | — | — |
| Partial-unknown-interactive | 1 | 6 | 10/10 (100.0%) | 33/37 (89.2%) |
| Partial-unknown-interactive | 2 | 1 | 2/2 (100.0%) | 6/6 (100.0%) |
| Partial-unknown-interactive | 3 | 0 | — | — |

## Failure attribution

| Condition | Format Error | Prediction Error | Action/Planning Error |
|---|---:|---:|---:|
| Omniscient | 0 | 0 | 0 |
| Partial-known | 0 | 0 | 0 |
| Partial-unknown-passive | 0 | 1 | 0 |
| Partial-unknown-interactive | 0 | 1 | 0 |

## Per-attempt results and PEEK use

| Episode | Result | Ticks | Attribution | PEEK | Data / film |
|---|---|---:|---|---:|---|
| omniscient-phase-0-attempt-1 | success | 9 | — | 0 | [truth + decisions](omniscient-phase-0-attempt-1/run.json), [public memory](omniscient-phase-0-attempt-1/public-history.json), [video](omniscient-phase-0-attempt-1/replay.mp4), [interactive](omniscient-phase-0-attempt-1/replay.html) |
| omniscient-phase-1-attempt-1 | success | 8 | — | 0 | [truth + decisions](omniscient-phase-1-attempt-1/run.json), [public memory](omniscient-phase-1-attempt-1/public-history.json) |
| omniscient-phase-2-attempt-1 | success | 7 | — | 0 | [truth + decisions](omniscient-phase-2-attempt-1/run.json), [public memory](omniscient-phase-2-attempt-1/public-history.json) |
| omniscient-phase-4-attempt-1 | success | 10 | — | 0 | [truth + decisions](omniscient-phase-4-attempt-1/run.json), [public memory](omniscient-phase-4-attempt-1/public-history.json) |
| omniscient-phase-5-attempt-1 | success | 9 | — | 0 | [truth + decisions](omniscient-phase-5-attempt-1/run.json), [public memory](omniscient-phase-5-attempt-1/public-history.json) |
| omniscient-phase-6-attempt-1 | success | 8 | — | 0 | [truth + decisions](omniscient-phase-6-attempt-1/run.json), [public memory](omniscient-phase-6-attempt-1/public-history.json) |
| partial-known-phase-0-attempt-1 | success | 9 | — | 0 | [truth + decisions](partial-known-phase-0-attempt-1/run.json), [public memory](partial-known-phase-0-attempt-1/public-history.json), [video](partial-known-phase-0-attempt-1/replay.mp4), [interactive](partial-known-phase-0-attempt-1/replay.html) |
| partial-known-phase-1-attempt-1 | success | 8 | — | 0 | [truth + decisions](partial-known-phase-1-attempt-1/run.json), [public memory](partial-known-phase-1-attempt-1/public-history.json) |
| partial-known-phase-2-attempt-1 | success | 7 | — | 0 | [truth + decisions](partial-known-phase-2-attempt-1/run.json), [public memory](partial-known-phase-2-attempt-1/public-history.json) |
| partial-known-phase-4-attempt-1 | success | 10 | — | 0 | [truth + decisions](partial-known-phase-4-attempt-1/run.json), [public memory](partial-known-phase-4-attempt-1/public-history.json) |
| partial-known-phase-5-attempt-1 | success | 9 | — | 0 | [truth + decisions](partial-known-phase-5-attempt-1/run.json), [public memory](partial-known-phase-5-attempt-1/public-history.json) |
| partial-known-phase-6-attempt-1 | success | 8 | — | 0 | [truth + decisions](partial-known-phase-6-attempt-1/run.json), [public memory](partial-known-phase-6-attempt-1/public-history.json) |
| partial-unknown-passive-phase-0-attempt-1 | success | 9 | — | 0 | [truth + decisions](partial-unknown-passive-phase-0-attempt-1/run.json), [public memory](partial-unknown-passive-phase-0-attempt-1/public-history.json), [video](partial-unknown-passive-phase-0-attempt-1/replay.mp4), [interactive](partial-unknown-passive-phase-0-attempt-1/replay.html) |
| partial-unknown-passive-phase-1-attempt-1 | success | 8 | — | 0 | [truth + decisions](partial-unknown-passive-phase-1-attempt-1/run.json), [public memory](partial-unknown-passive-phase-1-attempt-1/public-history.json) |
| partial-unknown-passive-phase-2-attempt-1 | success | 7 | — | 0 | [truth + decisions](partial-unknown-passive-phase-2-attempt-1/run.json), [public memory](partial-unknown-passive-phase-2-attempt-1/public-history.json) |
| partial-unknown-passive-phase-4-attempt-1 | success | 10 | — | 0 | [truth + decisions](partial-unknown-passive-phase-4-attempt-1/run.json), [public memory](partial-unknown-passive-phase-4-attempt-1/public-history.json) |
| partial-unknown-passive-phase-5-attempt-1 | vision | 7 | Prediction Error | 0 | [truth + decisions](partial-unknown-passive-phase-5-attempt-1/run.json), [public memory](partial-unknown-passive-phase-5-attempt-1/public-history.json), [video](partial-unknown-passive-phase-5-attempt-1/replay.mp4), [interactive](partial-unknown-passive-phase-5-attempt-1/replay.html) |
| partial-unknown-passive-phase-5-attempt-2 | success | 9 | — | 0 | [truth + decisions](partial-unknown-passive-phase-5-attempt-2/run.json), [public memory](partial-unknown-passive-phase-5-attempt-2/public-history.json) |
| partial-unknown-passive-phase-6-attempt-1 | success | 8 | — | 0 | [truth + decisions](partial-unknown-passive-phase-6-attempt-1/run.json), [public memory](partial-unknown-passive-phase-6-attempt-1/public-history.json) |
| partial-unknown-interactive-phase-0-attempt-1 | success | 9 | — | 2 | [truth + decisions](partial-unknown-interactive-phase-0-attempt-1/run.json), [public memory](partial-unknown-interactive-phase-0-attempt-1/public-history.json), [video](partial-unknown-interactive-phase-0-attempt-1/replay.mp4), [interactive](partial-unknown-interactive-phase-0-attempt-1/replay.html) |
| partial-unknown-interactive-phase-1-attempt-1 | collision | 4 | Prediction Error | 0 | [truth + decisions](partial-unknown-interactive-phase-1-attempt-1/run.json), [public memory](partial-unknown-interactive-phase-1-attempt-1/public-history.json), [video](partial-unknown-interactive-phase-1-attempt-1/replay.mp4), [interactive](partial-unknown-interactive-phase-1-attempt-1/replay.html) |
| partial-unknown-interactive-phase-1-attempt-2 | success | 8 | — | 1 | [truth + decisions](partial-unknown-interactive-phase-1-attempt-2/run.json), [public memory](partial-unknown-interactive-phase-1-attempt-2/public-history.json) |
| partial-unknown-interactive-phase-2-attempt-1 | success | 7 | — | 0 | [truth + decisions](partial-unknown-interactive-phase-2-attempt-1/run.json), [public memory](partial-unknown-interactive-phase-2-attempt-1/public-history.json) |
| partial-unknown-interactive-phase-4-attempt-1 | success | 10 | — | 1 | [truth + decisions](partial-unknown-interactive-phase-4-attempt-1/run.json), [public memory](partial-unknown-interactive-phase-4-attempt-1/public-history.json) |
| partial-unknown-interactive-phase-5-attempt-1 | success | 9 | — | 0 | [truth + decisions](partial-unknown-interactive-phase-5-attempt-1/run.json), [public memory](partial-unknown-interactive-phase-5-attempt-1/public-history.json) |
| partial-unknown-interactive-phase-6-attempt-1 | success | 8 | — | 1 | [truth + decisions](partial-unknown-interactive-phase-6-attempt-1/run.json), [public memory](partial-unknown-interactive-phase-6-attempt-1/public-history.json) |

### Interactive PEEK trigger positions

{"4,3":4,"1,3":1}

## Failure evidence

- partial-unknown-passive-phase-5-attempt-1: **Prediction Error** (vision). Wrong terminal next-state prediction; replacing the actual next robot with that prediction removes immediate death for the identical action.
- partial-unknown-interactive-phase-1-attempt-1: **Prediction Error** (collision). Wrong terminal next-state prediction; replacing the actual next robot with that prediction removes immediate death for the identical action.

## Metric definitions and privacy

Exact position AND heading at next tick, scored against private truth; visibility is the current input observation, before action. Only schema-valid executed actions enter prediction denominators.

Current input tick minus last legally seen tick in this attempt. Window and post-PEEK sightings reset age. Hidden steps at all non-window cells enter the main hidden metric; run-up-only metric is also reported.

Cumulative first-success rate across the fixed six phases. Pass@k is null (not tested) when k exceeds the condition attempt cap. Successful cases stop early; failures reset the identical phase.

Wrong terminal prediction counts as Prediction Error only when substituting the predicted next robot state removes the immediate fatal event. Otherwise Action/Planning Error; invalid JSON/schema is Format Error. Infrastructure errors remain incomplete.

All model inputs are built from allowlisted public observations and the model’s own decisions. Old legal sightings remain historical sightings. Hidden current or historical truth, phase IDs, Oracle paths, prediction scores and causal attributions never enter model input. Correctness is checked by hidden-truth mutation tests and exact wire reconstruction.

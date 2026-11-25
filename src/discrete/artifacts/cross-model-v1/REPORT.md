# Phase 2.4 — cross-model golden slices

Selected scope A,C status: COMPLETE. Full A/B/C matrix complete: false. Execution finished: true.

Operational cap3 for A/B; original prompt maxAttempts=5 unchanged for exact protocol equivalence. GPT is truncated read-only, no new calls. Markdown fences normalized for new models; other schema errors remain Format Error. Costs include separate preflight in model totals; table episode costs exclude preflight. Valid steps in incomplete episodes enter accuracy, request and fee totals; PEEK episode means use completed episodes only. Incomplete cases are not model failures; displayed pass counts are lower bounds until complete; capped means are unavailable until the cohort completes.

## Slice A

| Model | Complete | Pass | Capped mean | Visible pred | Occluded pred | Age1/2/3/4+ | PEEK mean; door fraction | Perception P / visible / joint | Attribution | Requests | Episode RMB (historical/new) |
|---|---|---|---:|---|---|---|---|---|---|---:|---:|
| gpt-5.6-sol | 6/6 (complete) | 2/6 → 5/6 → 6/6 | 1.83 | 11/16 (68.8%) | 30/75 (40.0%) | 5/11 (45.5%); 5/11 (45.5%); 3/11 (27.3%); 17/42 (40.5%) | 0.00; N/A | N/A | {"Format Error":0,"Prediction Error":5,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 91 | 5.742762 / 0.000000 |
| claude-opus-5-5 | 6/6 (complete) | 2/6 → 5/6 → 5/6 | 1.83 | 40/56 (71.4%) | 35/77 (45.5%) | 8/12 (66.7%); 7/12 (58.3%); 7/12 (58.3%); 13/41 (31.7%) | 0.00; N/A | N/A | {"Format Error":0,"Prediction Error":6,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 133 | 0.000000 / 16.846140 |
| gemini-4-argon | 6/6 (complete) | 2/6 → 4/6 → 6/6 | 2.00 | 55/78 (70.5%) | 30/60 (50.0%) | 7/12 (58.3%); 6/12 (50.0%); 4/12 (33.3%); 13/24 (54.2%) | 0.00; N/A | N/A | {"Format Error":0,"Prediction Error":6,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 138 | 0.000000 / 15.657654 |
## Slice B — Deferred (cost control)

| Model | Complete | Pass | Capped mean | Visible pred | Occluded pred | Age1/2/3/4+ | PEEK mean; door fraction | Perception P / visible / joint | Attribution | Requests | Episode RMB (historical/new) |
|---|---|---|---:|---|---|---|---|---|---|---:|---:|
| gpt-5.6-sol | 6/6 (Deferred (cost control)) | 4/6 → 5/6 → 6/6 | 1.50 | 17/22 (77.3%) | 22/51 (43.1%) | 7/15 (46.7%); 5/14 (35.7%); 4/12 (33.3%); 6/10 (60.0%) | 1.44; 84.6% | N/A | {"Format Error":0,"Prediction Error":3,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 73 | 4.130272 / 0.000000 |
| claude-opus-5-5 | 0/6 (Deferred (cost control)) | N/A (not measured) | INCOMPLETE | N/A | N/A | N/A; N/A; N/A; N/A | N/A; N/A | N/A | {"Format Error":0,"Prediction Error":0,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 0 | 0.000000 / 0.000000 |
| gemini-4-argon | 0/6 (Deferred (cost control)) | N/A (not measured) | INCOMPLETE | N/A | N/A | N/A; N/A; N/A; N/A | N/A; N/A | N/A | {"Format Error":0,"Prediction Error":0,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 0 | 0.000000 / 0.000000 |
## Slice C

| Model | Complete | Pass | Capped mean | Visible pred | Occluded pred | Age1/2/3/4+ | PEEK mean; door fraction | Perception P / visible / joint | Attribution | Requests | Episode RMB (historical/new) |
|---|---|---|---:|---|---|---|---|---|---|---:|---:|
| gpt-5.6-sol | 4/4 (complete) | 3/4 | 1.00 | 4/4 (100.0%) | 25/25 (100.0%) | 4/4 (100.0%); 4/4 (100.0%); 4/4 (100.0%); 13/13 (100.0%) | 0.00; N/A | 29/29 (100.0%); 29/29 (100.0%); 4/4 (100.0%) | {"Format Error":0,"Prediction Error":0,"Action/Planning Error":1,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 29 | 1.391450 / 0.000000 |
| claude-opus-5-5 | 4/4 (complete) | 4/4 | 1.00 | 6/6 (100.0%) | 29/29 (100.0%) | 4/4 (100.0%); 4/4 (100.0%); 4/4 (100.0%); 17/17 (100.0%) | 0.00; N/A | 35/35 (100.0%); 35/35 (100.0%); 6/6 (100.0%) | {"Format Error":0,"Prediction Error":0,"Action/Planning Error":0,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 35 | 0.000000 / 1.784820 |
| gemini-4-argon | 4/4 (complete) | 2/4 | 1.00 | 4/4 (100.0%) | 12/20 (60.0%) | 4/4 (100.0%); 2/4 (50.0%); 3/4 (75.0%); 3/8 (37.5%) | 0.00; N/A | 24/24 (100.0%); 24/24 (100.0%); 4/4 (100.0%) | {"Format Error":0,"Prediction Error":1,"Action/Planning Error":1,"Perception Error (Immediate)":0,"Perception Error (Upstream Sighting)":0} | 24 | 0.000000 / 2.742090 |

## Per-model actual gateway billing, including cached preflight

| Model | Historical RMB | Added this run RMB | Total RMB | Historical requests | New requests | Total requests |
|---|---:|---:|---:|---:|---:|---:|
| claude-opus-5-5 | 14.551820 | 4.172580 | 18.724400 | 123 | 47 | 170 |
| gemini-4-argon | 14.504894 | 4.100870 | 18.605764 | 129 | 35 | 164 |

GPT new requests and fees: 0. Each new model has its own cumulative 25 RMB ceiling with 0.50 reserve. Missing price metadata stops that model instead of inventing a tariff.

## Failed or interrupted episodes

- claude-opus-5-5 A-seed-101-attempt-1: Prediction Error ; [record](claude-opus-5-5-005912be/A-seed-101-attempt-1/run.json)
- claude-opus-5-5 A-seed-102-attempt-1: Prediction Error ; [record](claude-opus-5-5-005912be/A-seed-102-attempt-1/run.json)
- claude-opus-5-5 A-seed-102-attempt-2: Prediction Error ; [record](claude-opus-5-5-005912be/A-seed-102-attempt-2/run.json)
- claude-opus-5-5 A-seed-102-attempt-3: Prediction Error ; [record](claude-opus-5-5-005912be/A-seed-102-attempt-3/run.json)
- claude-opus-5-5 A-seed-105-attempt-1: Prediction Error ; [record](claude-opus-5-5-005912be/A-seed-105-attempt-1/run.json)
- claude-opus-5-5 A-seed-106-attempt-1: Prediction Error ; [record](claude-opus-5-5-005912be/A-seed-106-attempt-1/run.json)
- gemini-4-argon A-seed-101-attempt-1: Prediction Error ; [record](gemini-4-argon-fedcf067/A-seed-101-attempt-1/run.json)
- gemini-4-argon A-seed-101-attempt-2: Prediction Error ; [record](gemini-4-argon-fedcf067/A-seed-101-attempt-2/run.json)
- gemini-4-argon A-seed-102-attempt-1: Prediction Error ; [record](gemini-4-argon-fedcf067/A-seed-102-attempt-1/run.json)
- gemini-4-argon A-seed-102-attempt-2: Prediction Error ; [record](gemini-4-argon-fedcf067/A-seed-102-attempt-2/run.json)
- gemini-4-argon A-seed-104-attempt-1: Prediction Error ; [record](gemini-4-argon-fedcf067/A-seed-104-attempt-1/run.json)
- gemini-4-argon A-seed-106-attempt-1: Prediction Error ; [record](gemini-4-argon-fedcf067/A-seed-106-attempt-1/run.json)
- gemini-4-argon C-phase-0: Prediction Error ; [record](gemini-4-argon-fedcf067/C-phase-0/run.json)
- gemini-4-argon C-phase-4: Action/Planning Error ; [record](gemini-4-argon-fedcf067/C-phase-4/run.json)

[Comparison figure](cross-model-comparison.svg)

## Coverage and interpretation


Active slice scope: A, C. Deferred: B.

Curves from incomplete cohorts are lower bounds, not six-seed final pass rates. Capped means are N/A until all cases complete. Missing visual main trials cannot be replaced by their successful single-image connectivity preflight. Slice order follows the selected scope; this continuation explicitly defers B (cost control). No cross-model ranking is justified from unequal incomplete coverage.

Prompt protocol uses the original maxAttempts=5 verbatim while execution stops after attempt3. This matches the read-only GPT cap3 truncation; shortening the prompt to maxAttempts=3 would change the control. Model histories and trajectories naturally diverge with their own choices, but factories, serialization and observation rules are shared exactly.

## Objective observations for selected slices

- gpt-5.6-sol: mean first-attempt window observation decisions 1.00, first-pass 2/6, occluded prediction 30/75; capped attempt mean 1.8333333333333333.
- gpt-5.6-sol C: pass 3/4, actor perception counts {'player': {'correct': 29, 'total': 29, 'accuracy': 1}, 'robotVisible': {'correct': 29, 'total': 29, 'accuracy': 1}, 'robotJoint': {'correct': 4, 'total': 4, 'accuracy': 1}}, occluded prediction {'correct': 25, 'total': 25, 'accuracy': 1}, immediate attribution {'Format Error': 0, 'Prediction Error': 0, 'Action/Planning Error': 1, 'Perception Error (Immediate)': 0, 'Perception Error (Upstream Sighting)': 0}.
- claude-opus-5-5: mean first-attempt window observation decisions 3.33, first-pass 2/6, occluded prediction 35/77; capped attempt mean 1.8333333333333333.
- claude-opus-5-5 C: pass 4/4, actor perception counts {'player': {'correct': 35, 'total': 35, 'accuracy': 1}, 'robotVisible': {'correct': 35, 'total': 35, 'accuracy': 1}, 'robotJoint': {'correct': 6, 'total': 6, 'accuracy': 1}}, occluded prediction {'correct': 29, 'total': 29, 'accuracy': 1}, immediate attribution {'Format Error': 0, 'Prediction Error': 0, 'Action/Planning Error': 0, 'Perception Error (Immediate)': 0, 'Perception Error (Upstream Sighting)': 0}.
- gemini-4-argon: mean first-attempt window observation decisions 5.17, first-pass 2/6, occluded prediction 30/60; capped attempt mean 2.
- gemini-4-argon C: pass 2/4, actor perception counts {'player': {'correct': 24, 'total': 24, 'accuracy': 1}, 'robotVisible': {'correct': 24, 'total': 24, 'accuracy': 1}, 'robotJoint': {'correct': 4, 'total': 4, 'accuracy': 1}}, occluded prediction {'correct': 12, 'total': 20, 'accuracy': 0.6}, immediate attribution {'Format Error': 0, 'Prediction Error': 1, 'Action/Planning Error': 1, 'Perception Error (Immediate)': 0, 'Perception Error (Upstream Sighting)': 0}.

Window counts include the departure decision because its input is still a legal window observation. These six-seed single-run observations do not identify a causal benefit from extra waiting. Actor perception metrics do not separately measure interpretation of door geometry or occlusion semantics; planning labels must be read within that scope.

## Visual failure evidence

- gpt-5.6-sol partial-known-vision-phase-0: Action/Planning Error; prediction correct=True, actor perception={'player': True, 'visible': True, 'robot': None, 'all': True}; action=RIGHT. Reason: Enter the opaque door at (5,3). The inferred robot stays at (5,4) and reverses north; the door blocks its forward vision. [input frame](../vision-ablation/partial-known-vision-phase-0/frames/tick-03.png)
- gemini-4-argon C-phase-0: Prediction Error; prediction correct=False, actor perception={'player': True, 'visible': True, 'robot': None, 'all': True}; action=RIGHT. Reason: At t=4, the robot is at (5,3) heading N. On the next tick (t=5), the robot moves to (5,2) heading N, whose vision ray faces N towards z=1 and does not cover (5,3). Moving RIGHT to (5,3) safely crosses the patrol corridor. [input frame](gemini-4-argon-fedcf067/C-phase-0/frames/tick-04.png)
- gemini-4-argon C-phase-4: Action/Planning Error; prediction correct=True, actor perception={'player': True, 'visible': True, 'robot': None, 'all': True}; action=RIGHT. Reason: At t=0 the robot was at (5,4) heading N. Thus at t=1 it moved to (5,3)N, at t=2 to (5,2)N, and at current t=3 it arrived at endpoint (5,1) retaining heading N. On the next tick (t=4), it stays at (5,1) and reverses heading to S, whose vision ray reaches up to 3 cells south: (5,2), (5,3), (5,4). Wait—if at t=4 the robot is at (5,1) heading S, its vision ray covers (5,2), (5,3), (5,4), which would kill the player at (5,3)! Wait: let me re-verify! No, moving RIGHT to (5,3) at t=4 puts the player in the robot's vision ray from (5,1)S! Let me check when (5,3) is safe. Wait: at t=3 robot is (5,1)N. At t=4 robot is (5,1)S (vision: 5,2 to 5,4). At t=5 robot is (5,2)S (vision: 5,3 to 5,4). At t=6 robot is (5,3)S (collision at 5,3). At t=7 robot is (5,4)S (vision blocked by wall at 5,5, so 5,3 is behind it and safe!). Wait: can I cross right now or wait? I cannot change action mid-json, wait—I already wrote action RIGHT in the JSON field! Let me check if I can avoid death: unfortunately JSON is streamed sequentially, so action RIGHT is already emitted. [input frame](gemini-4-argon-fedcf067/C-phase-4/frames/tick-03.png)

The Gemini phase-4 reason explicitly recognizes that RIGHT enters the sight ray, but the action field remains RIGHT. This is an action/reason inconsistency under the unchanged protocol, not a demonstrated inability to perceive the robot or identify that danger. The GPT phase-0 reason instead invokes door protection at the crossing. These different planning failures must not be collapsed into a single visual-perception explanation.

[Verification](verification.json) · [Comparison SVG](cross-model-comparison.svg) · [Implementation](../../cross-model/README.md)

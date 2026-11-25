# Phase 2.2 — Tier-1 dynamics

Model: gpt-5.6-sol. Status: COMPLETE. Seeds: 101, 102, 103, 104, 105, 106.

[pass-curves.svg](pass-curves.svg) · [random-drift.svg](random-drift.svg) · [prediction-age.svg](prediction-age.svg)

Oracle: 90/90 solvable. Anti-prior Pass@1: Blind-Rush 0/6; Memoryless-Reactive 0/6; Symmetric-Prior-Heuristic 2/6.

## Dynamics degradation

| Dynamics | Condition | Complete | Pass@1..5 | Mean success attempt | Visible | Occluded | Age 1 | Age 2 | Age 3 | Age 4+ |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| pattern_shift | Omniscient | 6/6 | 6/6 | 1.00 (6/6 seeds) | 49/49 (100.0%) | — | — | — | — | — |
| identical_loop | Partial-unknown-passive | 6/6 | 2/6 → 5/6 → 6/6 → 6/6 → 6/6 | 1.83 (6/6 seeds) | 11/16 (68.8%) | 30/75 (40.0%) | 5/11 (45.5%) | 5/11 (45.5%) | 3/11 (27.3%) | 17/42 (40.5%) |
| identical_loop | Partial-unknown-interactive | 6/6 | 4/6 → 6/6 → 6/6 → 6/6 → 6/6 | 1.33 (6/6 seeds) | 13/20 (65.0%) | 22/46 (47.8%) | 13/17 (76.5%) | 5/9 (55.6%) | 4/9 (44.4%) | 0/11 (0.0%) |
| parametric_shift | Partial-unknown-passive | 6/6 | 2/6 → 2/6 → 3/6 → 5/6 → 5/6 | 2.60 (5/6 seeds) | 15/23 (65.2%) | 35/148 (23.6%) | 8/23 (34.8%) | 5/23 (21.7%) | 8/23 (34.8%) | 14/79 (17.7%) |
| parametric_shift | Partial-unknown-interactive | 6/6 | 4/6 → 5/6 → 6/6 → 6/6 → 6/6 | 1.50 (6/6 seeds) | 17/22 (77.3%) | 22/51 (43.1%) | 7/15 (46.7%) | 5/14 (35.7%) | 4/12 (33.3%) | 6/10 (60.0%) |
| pattern_shift | Partial-unknown-passive | 6/6 | 2/6 → 4/6 → 4/6 → 5/6 → 6/6 | 2.50 (6/6 seeds) | 11/18 (61.1%) | 28/94 (29.8%) | 8/15 (53.3%) | 6/15 (40.0%) | 3/15 (20.0%) | 11/49 (22.4%) |
| pattern_shift | Partial-unknown-interactive | 6/6 | 4/6 → 6/6 → 6/6 → 6/6 → 6/6 | 1.33 (6/6 seeds) | 9/15 (60.0%) | 18/42 (42.9%) | 7/13 (53.8%) | 5/11 (45.5%) | 4/10 (40.0%) | 2/8 (25.0%) |
| pure_random | Partial-unknown-passive | 6/6 | 4/6 → 6/6 → 6/6 → 6/6 → 6/6 | 1.33 (6/6 seeds) | 10/35 (28.6%) | 15/194 (7.7%) | 4/30 (13.3%) | 1/30 (3.3%) | 1/30 (3.3%) | 9/104 (8.7%) |
| pure_random | Partial-unknown-interactive | Not run (optional) | — | — | — | — | — | — | — | — |

`pure_random / interactive`: not run (optional). Omniscient has cap=1.

## Failure attribution and probing

| Dynamics | Condition | Format | Prediction | Planning | PEEK / attempt | PEEK positions |
|---|---|---:|---:|---:|---:|---|
| pattern_shift | Omniscient | 0 | 0 | 0 | 0.00 | {} |
| identical_loop | Partial-unknown-passive | 0 | 5 | 0 | 0.00 | {} |
| identical_loop | Partial-unknown-interactive | 0 | 2 | 0 | 1.50 | {"2,3":4,"3,3":2,"4,3":3,"1,3":3} |
| parametric_shift | Partial-unknown-passive | 0 | 13 | 0 | 0.00 | {} |
| parametric_shift | Partial-unknown-interactive | 0 | 3 | 0 | 1.44 | {"3,3":1,"4,3":11,"2,3":1} |
| pattern_shift | Partial-unknown-passive | 0 | 9 | 0 | 0.00 | {} |
| pattern_shift | Partial-unknown-interactive | 0 | 2 | 0 | 0.88 | {"4,3":3,"1,3":1,"2,3":1,"3,3":2} |
| pure_random | Partial-unknown-passive | 0 | 12 | 0 | 0.00 | {} |

## Pure-random baselines

| Policy | MC p (500) | Wilson 95% CI | Exact Markov p | Round-rate variance |
|---|---:|---|---:|---:|
| Blind-Rush | 0.496 | 0.452–0.540 | 0.5130 | 0.00243 |
| Wait-Random-Then-Rush | 0.514 | 0.470–0.558 | 0.5275 | 0.00203 |
| Memoryless-Reactive | 0.498 | 0.454–0.542 | 0.5067 | 0.00217 |

Independent-attempt reference cumulative chance Pass@1..5 (not learning):

- Blind-Rush: 51.3% → 76.3% → 88.4% → 94.4% → 97.3%.
- Wait-Random-Then-Rush: 52.7% → 77.7% → 89.4% → 95.0% → 97.6%.
- Memoryless-Reactive: 50.7% → 75.7% → 88.0% → 94.1% → 97.1%.

## Pure-random drift by attempt

| Attempt | Success | Wilson 95% CI | Action entropy (bits) | Mean window WAIT | Pattern-language flags |
|---|---:|---|---:|---:|---:|
| 1 | 4/6 | 0.300–0.903 | 0.755 | 0.33 | 0 |
| 2 | 2/6 | 0.097–0.700 | 0.884 | 0.00 | 0 |
| 3 | 3/6 | 0.188–0.812 | 0.782 | 0.00 | 0 |
| 4 | 5/6 | 0.436–0.970 | 0.615 | 0.50 | 0 |
| 5 | 4/6 | 0.300–0.903 | 0.874 | 0.00 | 0 |

### Full random cohort (success does not stop later attempts)

| Seed | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Attempt 5 |
|---|---|---|---|---|---|
| 101 | vision | success | success | success | success |
| 102 | success | vision | success | vision | collision |
| 103 | success | vision | collision | success | success |
| 104 | success | vision | success | success | success |
| 105 | success | collision | vision | success | success |
| 106 | collision | success | collision | success | vision |

### Matched-round baseline comparison

| Attempt | Reference | Baseline round CI | Exact p inside LLM CI? | 95% predictive successes at same n |
|---|---|---|---|---|
| 1 | Blind-Rush | 0.462–0.653 | true | 1–5 |
| 1 | Wait-Random-Then-Rush | 0.472–0.663 | true | 1–5 |
| 1 | Memoryless-Reactive | 0.462–0.653 | true | 1–5 |
| 2 | Blind-Rush | 0.394–0.587 | true | 1–5 |
| 2 | Wait-Random-Then-Rush | 0.443–0.634 | true | 1–5 |
| 2 | Memoryless-Reactive | 0.394–0.587 | true | 1–5 |
| 3 | Blind-Rush | 0.433–0.625 | true | 1–5 |
| 3 | Wait-Random-Then-Rush | 0.413–0.606 | true | 1–5 |
| 3 | Memoryless-Reactive | 0.413–0.606 | true | 1–5 |
| 4 | Blind-Rush | 0.366–0.557 | true | 1–5 |
| 4 | Wait-Random-Then-Rush | 0.404–0.596 | true | 1–5 |
| 4 | Memoryless-Reactive | 0.404–0.596 | true | 1–5 |
| 5 | Blind-Rush | 0.347–0.538 | true | 1–5 |
| 5 | Wait-Random-Then-Rush | 0.356–0.548 | true | 1–5 |
| 5 | Memoryless-Reactive | 0.337–0.528 | true | 1–5 |

Six LLM seeds per round are a small paired sample. Baseline Wilson intervals describe baseline Monte Carlo precision, not a six-run predictive acceptance band. Compare LLM Wilson intervals as well. Entropy, waits and pattern-language flags are descriptive, not causal proof of hallucination. Pure random is exogenous and independent across attempts; no early stopping. It is a bounded Markov process with heading persistence, so learning state-dependent probabilities is legitimate; absence of a periodic template does not make the reference-policy success rates an information-theoretic ceiling. See summary.json for actual action counts, paired per-seed outcomes, baseline round intervals and flagged reason excerpts.

## Observed findings (this fixed six-seed sample)

- identical_loop: Pass@2 passive 5/6 vs interactive 6/6; mean first-success attempt among successful seeds 1.83 vs 1.33. Success denominators are 6/6 vs 6/6, so these conditional means alone do not adjust for censoring.
- parametric_shift: Pass@2 passive 2/6 vs interactive 5/6; mean first-success attempt among successful seeds 2.60 vs 1.50. Success denominators are 5/6 vs 6/6, so these conditional means alone do not adjust for censoring.
- pattern_shift: Pass@2 passive 4/6 vs interactive 6/6; mean first-success attempt among successful seeds 2.50 vs 1.33. Success denominators are 6/6 vs 6/6, so these conditional means alone do not adjust for censoring.
- Pure random: 18/30 single-round successes, but cumulative Pass@2 6/6 with occluded accuracy 15/194 (7.7%). High cumulative success by itself does not establish accurate dynamics prediction or learning; independent retries already yield high cumulative chance success.
- All five per-round LLM Wilson intervals contain all three exact reference-policy probabilities: true. The six-run intervals are wide. These observations do not establish a systematic advantage or disadvantage relative to the reference policies.
- Action entropy by round: 0.755 → 0.884 → 0.782 → 0.615 → 0.874 bits; window WAIT means: 0.33 → 0.00 → 0.00 → 0.50 → 0.00. Neither sequence is monotonic in this run. Periodic-pattern keyword flags total 0; this heuristic is not a validated hallucination detector. There is no clear sustained preference drift in these descriptive measurements.
- Interactive PEEK per episode: identical_loop 1.500; parametric_shift 1.444; pattern_shift 0.875. Probing frequency does not increase monotonically with the named instability categories in this sample. Different episode durations and early-stop cohorts limit direct causal comparisons.

## Per-run records

| Episode | Outcome | Ticks | Attribution | Records |
|---|---|---:|---|---|
| identical_loop-partial-unknown-interactive-seed-101-attempt-1 | success | 10 | — | [run](identical_loop-partial-unknown-interactive-seed-101-attempt-1/run.json), [public](identical_loop-partial-unknown-interactive-seed-101-attempt-1/public-history.json), [video](identical_loop-partial-unknown-interactive-seed-101-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-interactive-seed-102-attempt-1 | vision | 4 | Prediction Error | [run](identical_loop-partial-unknown-interactive-seed-102-attempt-1/run.json), [public](identical_loop-partial-unknown-interactive-seed-102-attempt-1/public-history.json), [video](identical_loop-partial-unknown-interactive-seed-102-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-interactive-seed-102-attempt-2 | success | 10 | — | [run](identical_loop-partial-unknown-interactive-seed-102-attempt-2/run.json), [public](identical_loop-partial-unknown-interactive-seed-102-attempt-2/public-history.json) |
| identical_loop-partial-unknown-interactive-seed-103-attempt-1 | success | 8 | — | [run](identical_loop-partial-unknown-interactive-seed-103-attempt-1/run.json), [public](identical_loop-partial-unknown-interactive-seed-103-attempt-1/public-history.json) |
| identical_loop-partial-unknown-interactive-seed-104-attempt-1 | vision | 4 | Prediction Error | [run](identical_loop-partial-unknown-interactive-seed-104-attempt-1/run.json), [public](identical_loop-partial-unknown-interactive-seed-104-attempt-1/public-history.json), [video](identical_loop-partial-unknown-interactive-seed-104-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-interactive-seed-104-attempt-2 | success | 11 | — | [run](identical_loop-partial-unknown-interactive-seed-104-attempt-2/run.json), [public](identical_loop-partial-unknown-interactive-seed-104-attempt-2/public-history.json) |
| identical_loop-partial-unknown-interactive-seed-105-attempt-1 | success | 10 | — | [run](identical_loop-partial-unknown-interactive-seed-105-attempt-1/run.json), [public](identical_loop-partial-unknown-interactive-seed-105-attempt-1/public-history.json) |
| identical_loop-partial-unknown-interactive-seed-106-attempt-1 | success | 9 | — | [run](identical_loop-partial-unknown-interactive-seed-106-attempt-1/run.json), [public](identical_loop-partial-unknown-interactive-seed-106-attempt-1/public-history.json) |
| identical_loop-partial-unknown-passive-seed-101-attempt-1 | vision | 5 | Prediction Error | [run](identical_loop-partial-unknown-passive-seed-101-attempt-1/run.json), [public](identical_loop-partial-unknown-passive-seed-101-attempt-1/public-history.json), [video](identical_loop-partial-unknown-passive-seed-101-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-passive-seed-101-attempt-2 | success | 10 | — | [run](identical_loop-partial-unknown-passive-seed-101-attempt-2/run.json), [public](identical_loop-partial-unknown-passive-seed-101-attempt-2/public-history.json) |
| identical_loop-partial-unknown-passive-seed-102-attempt-1 | collision | 5 | Prediction Error | [run](identical_loop-partial-unknown-passive-seed-102-attempt-1/run.json), [public](identical_loop-partial-unknown-passive-seed-102-attempt-1/public-history.json), [video](identical_loop-partial-unknown-passive-seed-102-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-passive-seed-102-attempt-2 | vision | 8 | Prediction Error | [run](identical_loop-partial-unknown-passive-seed-102-attempt-2/run.json), [public](identical_loop-partial-unknown-passive-seed-102-attempt-2/public-history.json), [video](identical_loop-partial-unknown-passive-seed-102-attempt-2/replay.mp4) |
| identical_loop-partial-unknown-passive-seed-102-attempt-3 | success | 15 | — | [run](identical_loop-partial-unknown-passive-seed-102-attempt-3/run.json), [public](identical_loop-partial-unknown-passive-seed-102-attempt-3/public-history.json) |
| identical_loop-partial-unknown-passive-seed-103-attempt-1 | collision | 4 | Prediction Error | [run](identical_loop-partial-unknown-passive-seed-103-attempt-1/run.json), [public](identical_loop-partial-unknown-passive-seed-103-attempt-1/public-history.json), [video](identical_loop-partial-unknown-passive-seed-103-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-passive-seed-103-attempt-2 | success | 8 | — | [run](identical_loop-partial-unknown-passive-seed-103-attempt-2/run.json), [public](identical_loop-partial-unknown-passive-seed-103-attempt-2/public-history.json) |
| identical_loop-partial-unknown-passive-seed-104-attempt-1 | vision | 4 | Prediction Error | [run](identical_loop-partial-unknown-passive-seed-104-attempt-1/run.json), [public](identical_loop-partial-unknown-passive-seed-104-attempt-1/public-history.json), [video](identical_loop-partial-unknown-passive-seed-104-attempt-1/replay.mp4) |
| identical_loop-partial-unknown-passive-seed-104-attempt-2 | success | 11 | — | [run](identical_loop-partial-unknown-passive-seed-104-attempt-2/run.json), [public](identical_loop-partial-unknown-passive-seed-104-attempt-2/public-history.json) |
| identical_loop-partial-unknown-passive-seed-105-attempt-1 | success | 11 | — | [run](identical_loop-partial-unknown-passive-seed-105-attempt-1/run.json), [public](identical_loop-partial-unknown-passive-seed-105-attempt-1/public-history.json) |
| identical_loop-partial-unknown-passive-seed-106-attempt-1 | success | 10 | — | [run](identical_loop-partial-unknown-passive-seed-106-attempt-1/run.json), [public](identical_loop-partial-unknown-passive-seed-106-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-interactive-seed-101-attempt-1 | success | 8 | — | [run](parametric_shift-partial-unknown-interactive-seed-101-attempt-1/run.json), [public](parametric_shift-partial-unknown-interactive-seed-101-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-interactive-seed-102-attempt-1 | vision | 5 | Prediction Error | [run](parametric_shift-partial-unknown-interactive-seed-102-attempt-1/run.json), [public](parametric_shift-partial-unknown-interactive-seed-102-attempt-1/public-history.json), [video](parametric_shift-partial-unknown-interactive-seed-102-attempt-1/replay.mp4) |
| parametric_shift-partial-unknown-interactive-seed-102-attempt-2 | vision | 8 | Prediction Error | [run](parametric_shift-partial-unknown-interactive-seed-102-attempt-2/run.json), [public](parametric_shift-partial-unknown-interactive-seed-102-attempt-2/public-history.json), [video](parametric_shift-partial-unknown-interactive-seed-102-attempt-2/replay.mp4) |
| parametric_shift-partial-unknown-interactive-seed-102-attempt-3 | success | 14 | — | [run](parametric_shift-partial-unknown-interactive-seed-102-attempt-3/run.json), [public](parametric_shift-partial-unknown-interactive-seed-102-attempt-3/public-history.json), [video](parametric_shift-partial-unknown-interactive-seed-102-attempt-3/replay.mp4) |
| parametric_shift-partial-unknown-interactive-seed-103-attempt-1 | success | 7 | — | [run](parametric_shift-partial-unknown-interactive-seed-103-attempt-1/run.json), [public](parametric_shift-partial-unknown-interactive-seed-103-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-interactive-seed-104-attempt-1 | success | 8 | — | [run](parametric_shift-partial-unknown-interactive-seed-104-attempt-1/run.json), [public](parametric_shift-partial-unknown-interactive-seed-104-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-interactive-seed-105-attempt-1 | success | 9 | — | [run](parametric_shift-partial-unknown-interactive-seed-105-attempt-1/run.json), [public](parametric_shift-partial-unknown-interactive-seed-105-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-interactive-seed-106-attempt-1 | collision | 4 | Prediction Error | [run](parametric_shift-partial-unknown-interactive-seed-106-attempt-1/run.json), [public](parametric_shift-partial-unknown-interactive-seed-106-attempt-1/public-history.json), [video](parametric_shift-partial-unknown-interactive-seed-106-attempt-1/replay.mp4) |
| parametric_shift-partial-unknown-interactive-seed-106-attempt-2 | success | 10 | — | [run](parametric_shift-partial-unknown-interactive-seed-106-attempt-2/run.json), [public](parametric_shift-partial-unknown-interactive-seed-106-attempt-2/public-history.json) |
| parametric_shift-partial-unknown-passive-seed-101-attempt-1 | success | 9 | — | [run](parametric_shift-partial-unknown-passive-seed-101-attempt-1/run.json), [public](parametric_shift-partial-unknown-passive-seed-101-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-passive-seed-102-attempt-1 | vision | 4 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-102-attempt-1/run.json), [public](parametric_shift-partial-unknown-passive-seed-102-attempt-1/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-102-attempt-1/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-102-attempt-2 | collision | 6 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-102-attempt-2/run.json), [public](parametric_shift-partial-unknown-passive-seed-102-attempt-2/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-102-attempt-2/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-102-attempt-3 | vision | 8 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-102-attempt-3/run.json), [public](parametric_shift-partial-unknown-passive-seed-102-attempt-3/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-102-attempt-3/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-102-attempt-4 | success | 14 | — | [run](parametric_shift-partial-unknown-passive-seed-102-attempt-4/run.json), [public](parametric_shift-partial-unknown-passive-seed-102-attempt-4/public-history.json) |
| parametric_shift-partial-unknown-passive-seed-103-attempt-1 | success | 7 | — | [run](parametric_shift-partial-unknown-passive-seed-103-attempt-1/run.json), [public](parametric_shift-partial-unknown-passive-seed-103-attempt-1/public-history.json) |
| parametric_shift-partial-unknown-passive-seed-104-attempt-1 | vision | 7 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-104-attempt-1/run.json), [public](parametric_shift-partial-unknown-passive-seed-104-attempt-1/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-104-attempt-1/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-104-attempt-2 | vision | 4 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-104-attempt-2/run.json), [public](parametric_shift-partial-unknown-passive-seed-104-attempt-2/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-104-attempt-2/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-104-attempt-3 | success | 9 | — | [run](parametric_shift-partial-unknown-passive-seed-104-attempt-3/run.json), [public](parametric_shift-partial-unknown-passive-seed-104-attempt-3/public-history.json) |
| parametric_shift-partial-unknown-passive-seed-105-attempt-1 | vision | 7 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-105-attempt-1/run.json), [public](parametric_shift-partial-unknown-passive-seed-105-attempt-1/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-105-attempt-1/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-105-attempt-2 | collision | 7 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-105-attempt-2/run.json), [public](parametric_shift-partial-unknown-passive-seed-105-attempt-2/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-105-attempt-2/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-105-attempt-3 | vision | 8 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-105-attempt-3/run.json), [public](parametric_shift-partial-unknown-passive-seed-105-attempt-3/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-105-attempt-3/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-105-attempt-4 | vision | 24 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-105-attempt-4/run.json), [public](parametric_shift-partial-unknown-passive-seed-105-attempt-4/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-105-attempt-4/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-105-attempt-5 | vision | 7 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-105-attempt-5/run.json), [public](parametric_shift-partial-unknown-passive-seed-105-attempt-5/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-105-attempt-5/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-106-attempt-1 | collision | 4 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-106-attempt-1/run.json), [public](parametric_shift-partial-unknown-passive-seed-106-attempt-1/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-106-attempt-1/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-106-attempt-2 | collision | 6 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-106-attempt-2/run.json), [public](parametric_shift-partial-unknown-passive-seed-106-attempt-2/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-106-attempt-2/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-106-attempt-3 | collision | 18 | Prediction Error | [run](parametric_shift-partial-unknown-passive-seed-106-attempt-3/run.json), [public](parametric_shift-partial-unknown-passive-seed-106-attempt-3/public-history.json), [video](parametric_shift-partial-unknown-passive-seed-106-attempt-3/replay.mp4) |
| parametric_shift-partial-unknown-passive-seed-106-attempt-4 | success | 22 | — | [run](parametric_shift-partial-unknown-passive-seed-106-attempt-4/run.json), [public](parametric_shift-partial-unknown-passive-seed-106-attempt-4/public-history.json) |
| pattern_shift-omniscient-seed-101-attempt-1 | success | 7 | — | [run](pattern_shift-omniscient-seed-101-attempt-1/run.json), [public](pattern_shift-omniscient-seed-101-attempt-1/public-history.json) |
| pattern_shift-omniscient-seed-102-attempt-1 | success | 13 | — | [run](pattern_shift-omniscient-seed-102-attempt-1/run.json), [public](pattern_shift-omniscient-seed-102-attempt-1/public-history.json) |
| pattern_shift-omniscient-seed-103-attempt-1 | success | 8 | — | [run](pattern_shift-omniscient-seed-103-attempt-1/run.json), [public](pattern_shift-omniscient-seed-103-attempt-1/public-history.json) |
| pattern_shift-omniscient-seed-104-attempt-1 | success | 7 | — | [run](pattern_shift-omniscient-seed-104-attempt-1/run.json), [public](pattern_shift-omniscient-seed-104-attempt-1/public-history.json) |
| pattern_shift-omniscient-seed-105-attempt-1 | success | 7 | — | [run](pattern_shift-omniscient-seed-105-attempt-1/run.json), [public](pattern_shift-omniscient-seed-105-attempt-1/public-history.json) |
| pattern_shift-omniscient-seed-106-attempt-1 | success | 7 | — | [run](pattern_shift-omniscient-seed-106-attempt-1/run.json), [public](pattern_shift-omniscient-seed-106-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-interactive-seed-101-attempt-1 | success | 8 | — | [run](pattern_shift-partial-unknown-interactive-seed-101-attempt-1/run.json), [public](pattern_shift-partial-unknown-interactive-seed-101-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-interactive-seed-102-attempt-1 | vision | 4 | Prediction Error | [run](pattern_shift-partial-unknown-interactive-seed-102-attempt-1/run.json), [public](pattern_shift-partial-unknown-interactive-seed-102-attempt-1/public-history.json), [video](pattern_shift-partial-unknown-interactive-seed-102-attempt-1/replay.mp4) |
| pattern_shift-partial-unknown-interactive-seed-102-attempt-2 | success | 10 | — | [run](pattern_shift-partial-unknown-interactive-seed-102-attempt-2/run.json), [public](pattern_shift-partial-unknown-interactive-seed-102-attempt-2/public-history.json), [video](pattern_shift-partial-unknown-interactive-seed-102-attempt-2/replay.mp4) |
| pattern_shift-partial-unknown-interactive-seed-103-attempt-1 | success | 8 | — | [run](pattern_shift-partial-unknown-interactive-seed-103-attempt-1/run.json), [public](pattern_shift-partial-unknown-interactive-seed-103-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-interactive-seed-104-attempt-1 | success | 7 | — | [run](pattern_shift-partial-unknown-interactive-seed-104-attempt-1/run.json), [public](pattern_shift-partial-unknown-interactive-seed-104-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-interactive-seed-105-attempt-1 | vision | 5 | Prediction Error | [run](pattern_shift-partial-unknown-interactive-seed-105-attempt-1/run.json), [public](pattern_shift-partial-unknown-interactive-seed-105-attempt-1/public-history.json), [video](pattern_shift-partial-unknown-interactive-seed-105-attempt-1/replay.mp4) |
| pattern_shift-partial-unknown-interactive-seed-105-attempt-2 | success | 8 | — | [run](pattern_shift-partial-unknown-interactive-seed-105-attempt-2/run.json), [public](pattern_shift-partial-unknown-interactive-seed-105-attempt-2/public-history.json) |
| pattern_shift-partial-unknown-interactive-seed-106-attempt-1 | success | 7 | — | [run](pattern_shift-partial-unknown-interactive-seed-106-attempt-1/run.json), [public](pattern_shift-partial-unknown-interactive-seed-106-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-passive-seed-101-attempt-1 | vision | 8 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-101-attempt-1/run.json), [public](pattern_shift-partial-unknown-passive-seed-101-attempt-1/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-101-attempt-1/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-101-attempt-2 | success | 7 | — | [run](pattern_shift-partial-unknown-passive-seed-101-attempt-2/run.json), [public](pattern_shift-partial-unknown-passive-seed-101-attempt-2/public-history.json) |
| pattern_shift-partial-unknown-passive-seed-102-attempt-1 | vision | 4 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-102-attempt-1/run.json), [public](pattern_shift-partial-unknown-passive-seed-102-attempt-1/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-102-attempt-1/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-102-attempt-2 | collision | 5 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-102-attempt-2/run.json), [public](pattern_shift-partial-unknown-passive-seed-102-attempt-2/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-102-attempt-2/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-102-attempt-3 | collision | 8 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-102-attempt-3/run.json), [public](pattern_shift-partial-unknown-passive-seed-102-attempt-3/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-102-attempt-3/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-102-attempt-4 | vision | 7 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-102-attempt-4/run.json), [public](pattern_shift-partial-unknown-passive-seed-102-attempt-4/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-102-attempt-4/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-102-attempt-5 | success | 11 | — | [run](pattern_shift-partial-unknown-passive-seed-102-attempt-5/run.json), [public](pattern_shift-partial-unknown-passive-seed-102-attempt-5/public-history.json) |
| pattern_shift-partial-unknown-passive-seed-103-attempt-1 | success | 9 | — | [run](pattern_shift-partial-unknown-passive-seed-103-attempt-1/run.json), [public](pattern_shift-partial-unknown-passive-seed-103-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-passive-seed-104-attempt-1 | success | 7 | — | [run](pattern_shift-partial-unknown-passive-seed-104-attempt-1/run.json), [public](pattern_shift-partial-unknown-passive-seed-104-attempt-1/public-history.json) |
| pattern_shift-partial-unknown-passive-seed-105-attempt-1 | collision | 8 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-105-attempt-1/run.json), [public](pattern_shift-partial-unknown-passive-seed-105-attempt-1/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-105-attempt-1/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-105-attempt-2 | success | 9 | — | [run](pattern_shift-partial-unknown-passive-seed-105-attempt-2/run.json), [public](pattern_shift-partial-unknown-passive-seed-105-attempt-2/public-history.json) |
| pattern_shift-partial-unknown-passive-seed-106-attempt-1 | vision | 5 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-106-attempt-1/run.json), [public](pattern_shift-partial-unknown-passive-seed-106-attempt-1/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-106-attempt-1/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-106-attempt-2 | collision | 7 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-106-attempt-2/run.json), [public](pattern_shift-partial-unknown-passive-seed-106-attempt-2/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-106-attempt-2/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-106-attempt-3 | collision | 5 | Prediction Error | [run](pattern_shift-partial-unknown-passive-seed-106-attempt-3/run.json), [public](pattern_shift-partial-unknown-passive-seed-106-attempt-3/public-history.json), [video](pattern_shift-partial-unknown-passive-seed-106-attempt-3/replay.mp4) |
| pattern_shift-partial-unknown-passive-seed-106-attempt-4 | success | 12 | — | [run](pattern_shift-partial-unknown-passive-seed-106-attempt-4/run.json), [public](pattern_shift-partial-unknown-passive-seed-106-attempt-4/public-history.json) |
| pure_random-partial-unknown-passive-seed-101-attempt-1 | vision | 8 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-101-attempt-1/run.json), [public](pure_random-partial-unknown-passive-seed-101-attempt-1/public-history.json), [video](pure_random-partial-unknown-passive-seed-101-attempt-1/replay.mp4) |
| pure_random-partial-unknown-passive-seed-101-attempt-2 | success | 9 | — | [run](pure_random-partial-unknown-passive-seed-101-attempt-2/run.json), [public](pure_random-partial-unknown-passive-seed-101-attempt-2/public-history.json), [video](pure_random-partial-unknown-passive-seed-101-attempt-2/replay.mp4) |
| pure_random-partial-unknown-passive-seed-101-attempt-3 | success | 8 | — | [run](pure_random-partial-unknown-passive-seed-101-attempt-3/run.json), [public](pure_random-partial-unknown-passive-seed-101-attempt-3/public-history.json) |
| pure_random-partial-unknown-passive-seed-101-attempt-4 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-101-attempt-4/run.json), [public](pure_random-partial-unknown-passive-seed-101-attempt-4/public-history.json) |
| pure_random-partial-unknown-passive-seed-101-attempt-5 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-101-attempt-5/run.json), [public](pure_random-partial-unknown-passive-seed-101-attempt-5/public-history.json) |
| pure_random-partial-unknown-passive-seed-102-attempt-1 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-102-attempt-1/run.json), [public](pure_random-partial-unknown-passive-seed-102-attempt-1/public-history.json) |
| pure_random-partial-unknown-passive-seed-102-attempt-2 | vision | 7 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-102-attempt-2/run.json), [public](pure_random-partial-unknown-passive-seed-102-attempt-2/public-history.json), [video](pure_random-partial-unknown-passive-seed-102-attempt-2/replay.mp4) |
| pure_random-partial-unknown-passive-seed-102-attempt-3 | success | 8 | — | [run](pure_random-partial-unknown-passive-seed-102-attempt-3/run.json), [public](pure_random-partial-unknown-passive-seed-102-attempt-3/public-history.json) |
| pure_random-partial-unknown-passive-seed-102-attempt-4 | vision | 5 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-102-attempt-4/run.json), [public](pure_random-partial-unknown-passive-seed-102-attempt-4/public-history.json), [video](pure_random-partial-unknown-passive-seed-102-attempt-4/replay.mp4) |
| pure_random-partial-unknown-passive-seed-102-attempt-5 | collision | 12 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-102-attempt-5/run.json), [public](pure_random-partial-unknown-passive-seed-102-attempt-5/public-history.json), [video](pure_random-partial-unknown-passive-seed-102-attempt-5/replay.mp4) |
| pure_random-partial-unknown-passive-seed-103-attempt-1 | success | 9 | — | [run](pure_random-partial-unknown-passive-seed-103-attempt-1/run.json), [public](pure_random-partial-unknown-passive-seed-103-attempt-1/public-history.json) |
| pure_random-partial-unknown-passive-seed-103-attempt-2 | vision | 4 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-103-attempt-2/run.json), [public](pure_random-partial-unknown-passive-seed-103-attempt-2/public-history.json), [video](pure_random-partial-unknown-passive-seed-103-attempt-2/replay.mp4) |
| pure_random-partial-unknown-passive-seed-103-attempt-3 | collision | 9 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-103-attempt-3/run.json), [public](pure_random-partial-unknown-passive-seed-103-attempt-3/public-history.json), [video](pure_random-partial-unknown-passive-seed-103-attempt-3/replay.mp4) |
| pure_random-partial-unknown-passive-seed-103-attempt-4 | success | 10 | — | [run](pure_random-partial-unknown-passive-seed-103-attempt-4/run.json), [public](pure_random-partial-unknown-passive-seed-103-attempt-4/public-history.json) |
| pure_random-partial-unknown-passive-seed-103-attempt-5 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-103-attempt-5/run.json), [public](pure_random-partial-unknown-passive-seed-103-attempt-5/public-history.json) |
| pure_random-partial-unknown-passive-seed-104-attempt-1 | success | 11 | — | [run](pure_random-partial-unknown-passive-seed-104-attempt-1/run.json), [public](pure_random-partial-unknown-passive-seed-104-attempt-1/public-history.json) |
| pure_random-partial-unknown-passive-seed-104-attempt-2 | vision | 8 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-104-attempt-2/run.json), [public](pure_random-partial-unknown-passive-seed-104-attempt-2/public-history.json), [video](pure_random-partial-unknown-passive-seed-104-attempt-2/replay.mp4) |
| pure_random-partial-unknown-passive-seed-104-attempt-3 | success | 8 | — | [run](pure_random-partial-unknown-passive-seed-104-attempt-3/run.json), [public](pure_random-partial-unknown-passive-seed-104-attempt-3/public-history.json) |
| pure_random-partial-unknown-passive-seed-104-attempt-4 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-104-attempt-4/run.json), [public](pure_random-partial-unknown-passive-seed-104-attempt-4/public-history.json) |
| pure_random-partial-unknown-passive-seed-104-attempt-5 | success | 10 | — | [run](pure_random-partial-unknown-passive-seed-104-attempt-5/run.json), [public](pure_random-partial-unknown-passive-seed-104-attempt-5/public-history.json) |
| pure_random-partial-unknown-passive-seed-105-attempt-1 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-105-attempt-1/run.json), [public](pure_random-partial-unknown-passive-seed-105-attempt-1/public-history.json) |
| pure_random-partial-unknown-passive-seed-105-attempt-2 | collision | 7 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-105-attempt-2/run.json), [public](pure_random-partial-unknown-passive-seed-105-attempt-2/public-history.json), [video](pure_random-partial-unknown-passive-seed-105-attempt-2/replay.mp4) |
| pure_random-partial-unknown-passive-seed-105-attempt-3 | vision | 6 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-105-attempt-3/run.json), [public](pure_random-partial-unknown-passive-seed-105-attempt-3/public-history.json), [video](pure_random-partial-unknown-passive-seed-105-attempt-3/replay.mp4) |
| pure_random-partial-unknown-passive-seed-105-attempt-4 | success | 10 | — | [run](pure_random-partial-unknown-passive-seed-105-attempt-4/run.json), [public](pure_random-partial-unknown-passive-seed-105-attempt-4/public-history.json) |
| pure_random-partial-unknown-passive-seed-105-attempt-5 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-105-attempt-5/run.json), [public](pure_random-partial-unknown-passive-seed-105-attempt-5/public-history.json) |
| pure_random-partial-unknown-passive-seed-106-attempt-1 | collision | 4 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-106-attempt-1/run.json), [public](pure_random-partial-unknown-passive-seed-106-attempt-1/public-history.json), [video](pure_random-partial-unknown-passive-seed-106-attempt-1/replay.mp4) |
| pure_random-partial-unknown-passive-seed-106-attempt-2 | success | 8 | — | [run](pure_random-partial-unknown-passive-seed-106-attempt-2/run.json), [public](pure_random-partial-unknown-passive-seed-106-attempt-2/public-history.json) |
| pure_random-partial-unknown-passive-seed-106-attempt-3 | collision | 4 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-106-attempt-3/run.json), [public](pure_random-partial-unknown-passive-seed-106-attempt-3/public-history.json), [video](pure_random-partial-unknown-passive-seed-106-attempt-3/replay.mp4) |
| pure_random-partial-unknown-passive-seed-106-attempt-4 | success | 7 | — | [run](pure_random-partial-unknown-passive-seed-106-attempt-4/run.json), [public](pure_random-partial-unknown-passive-seed-106-attempt-4/public-history.json) |
| pure_random-partial-unknown-passive-seed-106-attempt-5 | vision | 8 | Prediction Error | [run](pure_random-partial-unknown-passive-seed-106-attempt-5/run.json), [public](pure_random-partial-unknown-passive-seed-106-attempt-5/public-history.json), [video](pure_random-partial-unknown-passive-seed-106-attempt-5/replay.mp4) |

## Failure evidence

- identical_loop-partial-unknown-interactive-seed-102-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- identical_loop-partial-unknown-interactive-seed-104-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- identical_loop-partial-unknown-passive-seed-101-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- identical_loop-partial-unknown-passive-seed-102-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- identical_loop-partial-unknown-passive-seed-102-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- identical_loop-partial-unknown-passive-seed-103-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- identical_loop-partial-unknown-passive-seed-104-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-interactive-seed-102-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-interactive-seed-102-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-interactive-seed-106-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-102-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-102-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-102-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-104-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-104-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-105-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-105-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-105-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-105-attempt-4: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-105-attempt-5: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-106-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-106-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- parametric_shift-partial-unknown-passive-seed-106-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-interactive-seed-102-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-interactive-seed-105-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-101-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-102-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-102-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-102-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-102-attempt-4: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-105-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-106-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-106-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pattern_shift-partial-unknown-passive-seed-106-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-101-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-102-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-102-attempt-4: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-102-attempt-5: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-103-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-103-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-104-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-105-attempt-2: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-105-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-106-attempt-1: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-106-attempt-3: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.
- pure_random-partial-unknown-passive-seed-106-attempt-5: Prediction Error. Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.

## Definitions

Mean first-success attempt among seeds that succeeded; unsuccessful seeds are reported separately. Restricted mean treats no success as cap; random execution still always consumes 5 attempts.

Joint next position AND heading; visibility at action input. PEEK affects the following observation. Age counts ticks since the last legal sighting within the current attempt.

Main accuracy and action entropy pool recorded actions, so phases/attempt durations and early stopping affect denominators. Age 4+ is not necessarily a monotonic degradation curve.

pure_random interactive deliberately not run (optional cost slice). Unknown prompts contain no mode IDs, true rules, seeds, future truth or correctness feedback. Omniscient verification alone receives the current true transition rule and counters.

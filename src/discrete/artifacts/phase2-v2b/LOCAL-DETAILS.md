# Local audit details

Old-rule diagnostics are associations, not causal evidence of memory reliance. Primary evaluates previous parameters on actual current internal counters; latent-support marginalizes compatible phases; elapsed-trajectory replays old phase at the same tick.

| Mode / condition | Wrong | Applicable | Direct matches | Compatible-old-phase support | Old elapsed-trajectory matches |
|---|---:|---:|---:|---:|---:|
| parametric_shift / Partial-unknown-passive | 95 | 84 | 2 | 22 | 16 |
| parametric_shift / Partial-unknown-interactive | 11 | 9 | 0 | 5 | 3 |
| pattern_shift / Partial-unknown-passive | 46 | 46 | 0 | 9 | 2 |
| pattern_shift / Partial-unknown-interactive | 13 | 13 | 1 | 4 | 0 |

## Seed 105 original reasoning

### Partial-unknown-interactive, attempt 1, success

Explicit prior-attempt/failure references: 0.

- tick 8, action RIGHT, correct=False: The robot is projected to reverse at the north boundary and move south to [5,1]. Moving right reaches the exit at [8,3], outside its south-facing vision ray.
### Partial-unknown-passive, attempt 1, vision

Explicit prior-attempt/failure references: 0.

- tick 6, action RIGHT, correct=False: The robot is predicted to move north from [5,3] to [5,2]. Cross the opaque door to [5,3], behind its north-facing vision ray, avoiding collision and advancing toward the exit.
### Partial-unknown-passive, attempt 2, collision

Explicit prior-attempt/failure references: 0.

- tick 6, action RIGHT, correct=False: The robot is predicted to move south from [5,3] to [5,4]. Cross the opaque door to [5,3], behind its updated south-facing vision ray and without collision.
### Partial-unknown-passive, attempt 3, vision

Explicit prior-attempt/failure references: 1.

- tick 7, action RIGHT, correct=False: The prior same-start collision implies the robot was likely one tick behind the earlier estimate, at [5,3] on tick 7. Predict it now moves south to [5,4]; cross to [5,3], behind its south-facing vision and without collision.
- tick 7, action RIGHT, correct=False: The prior same-start collision implies the robot was likely one tick behind the earlier estimate, at [5,3] on tick 7. Predict it now moves south to [5,4]; cross to [5,3], behind its south-facing vision and without collision.
### Partial-unknown-passive, attempt 4, vision

Explicit prior-attempt/failure references: 1.

- tick 5, action LEFT, correct=False: Predict the robot continues north from [5,3] to [5,2]. Prior attempts show hidden timing is unreliable, so retreat toward the window for a fresh legal sighting rather than risk crossing the door.
- tick 23, action RIGHT, correct=False: From the tick-17 sighting and the observed intermittent hidden pauses, predict the robot is continuing north to [5,1]. Cross the opaque door now to [5,3], behind its north-facing vision; four eastward moves reach the exit before timeout.
### Partial-unknown-passive, attempt 5, vision

Explicit prior-attempt/failure references: 0.

- tick 6, action RIGHT, correct=False: The robot continues north from [5,3] to [5,2] at tick 7. Cross the opaque door to [5,3], behind its north-facing vision ray and without collision.

## Representative failed-step reasoning

- parametric_shift-partial-unknown-passive-seed-102-attempt-2, tick 5: The robot should advance south from [5,3] to [5,4]. Crossing to [5,3] avoids collision and is behind its updated south-facing vision ray.
- parametric_shift-partial-unknown-interactive-seed-102-attempt-2, tick 7: The observed robot should advance south from [5,4] to [5,5]. Crossing the opaque door to [5,3] avoids collision and lies behind its updated south-facing vision ray.
- pattern_shift-partial-unknown-passive-seed-102-attempt-2, tick 4: Cross the opaque door to [5,3] after waiting for the robot to clear the corridor. Predict it continues north from [5,2] to [5,1]; its north-facing vision points away from the player, and there is no collision or edge swap.

## Immediate Counterfactual Attribution

Only the directly fatal step is relabeled; earlier risk management is not ruled out. Stochastic Realization Error is an interpretation for the random world, not a new replay of causality.

| Dynamics | Condition | Format | Prediction | Planning | Stochastic realization |
|---|---|---:|---:|---:|---:|
| pattern_shift | Omniscient | 0 | 0 | 0 | 0 |
| identical_loop | Partial-unknown-passive | 0 | 5 | 0 | 0 |
| identical_loop | Partial-unknown-interactive | 0 | 2 | 0 | 0 |
| parametric_shift | Partial-unknown-passive | 0 | 13 | 0 | 0 |
| parametric_shift | Partial-unknown-interactive | 0 | 3 | 0 | 0 |
| pattern_shift | Partial-unknown-passive | 0 | 9 | 0 | 0 |
| pattern_shift | Partial-unknown-interactive | 0 | 2 | 0 | 0 |
| pure_random | Partial-unknown-passive | 0 | 0 | 0 | 12 |

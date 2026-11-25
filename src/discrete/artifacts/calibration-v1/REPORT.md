# Discrete calibration

Status: PASS. Model: gpt-5.6-sol. Fixed phases: 0, 1, 4, 6, 10.

| Condition | Success | Prediction accuracy |
|---|---:|---:|
| Oracle | 5/5 | — |
| Future-known | 5/5 | — |
| Omniscient | 5/5 | 43/43 (100.00%) |

## Per-run report

| Run | Result | Ticks | Attribution | Replay |
|---|---|---:|---|---|
| oracle-phase-0 | success | 10 | — | [video](oracle-phase-0/replay.mp4), [interactive](oracle-phase-0/replay.html) |
| oracle-phase-1 | success | 9 | — | [video](oracle-phase-1/replay.mp4), [interactive](oracle-phase-1/replay.html) |
| oracle-phase-4 | success | 7 | — | [video](oracle-phase-4/replay.mp4), [interactive](oracle-phase-4/replay.html) |
| oracle-phase-6 | success | 10 | — | [video](oracle-phase-6/replay.mp4), [interactive](oracle-phase-6/replay.html) |
| oracle-phase-10 | success | 7 | — | [video](oracle-phase-10/replay.mp4), [interactive](oracle-phase-10/replay.html) |
| future-known-phase-0 | success | 10 | — | [video](future-known-phase-0/replay.mp4), [interactive](future-known-phase-0/replay.html) |
| future-known-phase-1 | success | 9 | — | [video](future-known-phase-1/replay.mp4), [interactive](future-known-phase-1/replay.html) |
| future-known-phase-4 | success | 7 | — | [video](future-known-phase-4/replay.mp4), [interactive](future-known-phase-4/replay.html) |
| future-known-phase-6 | success | 10 | — | [video](future-known-phase-6/replay.mp4), [interactive](future-known-phase-6/replay.html) |
| future-known-phase-10 | success | 7 | — | [video](future-known-phase-10/replay.mp4), [interactive](future-known-phase-10/replay.html) |
| omniscient-phase-0 | success | 10 | — | [video](omniscient-phase-0/replay.mp4), [interactive](omniscient-phase-0/replay.html) |
| omniscient-phase-1 | success | 9 | — | [video](omniscient-phase-1/replay.mp4), [interactive](omniscient-phase-1/replay.html) |
| omniscient-phase-4 | success | 7 | — | [video](omniscient-phase-4/replay.mp4), [interactive](omniscient-phase-4/replay.html) |
| omniscient-phase-6 | success | 10 | — | [video](omniscient-phase-6/replay.mp4), [interactive](omniscient-phase-6/replay.html) |
| omniscient-phase-10 | success | 7 | — | [video](omniscient-phase-10/replay.mp4), [interactive](omniscient-phase-10/replay.html) |

## Oracle shortest safe action sequences

- phase 0: WAIT, WAIT, WAIT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT (10 ticks).
- phase 1: WAIT, WAIT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT (9 ticks).
- phase 4: RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT (7 ticks).
- phase 6: WAIT, WAIT, WAIT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT (10 ticks).
- phase 10: RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT (7 ticks).

## Failure evidence

No model failures in completed episodes.


Prediction Error requires a wrong terminal prediction and a one-step counterfactual removing collision/swap/vision death. Other decision failures and timeouts are Action/Planning Error; invalid JSON/schema is Format Error. Infrastructure interruptions remain incomplete, never scored as model failures.

Exact joint position AND heading accuracy over schema-valid Omniscient actions; format responses are separately counted.

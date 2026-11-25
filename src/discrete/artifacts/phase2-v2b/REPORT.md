# Phase 2.2b

| Condition | Pass@1..5 (of 6) | Mean success attempt | Visible | Occluded | Requests | RMB |
|---|---|---|---|---|---|---|
| Memory-on | 2→5→6→6→6 | 1.8333333333333333 | 11/16 | 30/75 | 91 | 5.742762 |
| Memory-off | 3→3→3→3→3 | 1 | 15/22 | 13/75 | 97 | 3.885898 |

Memory-off complete: true. Success-conditional mean covers 3/6 seeds; restricted mean at cap=5 is 3. Memory-on restricted mean is 1.8333333333333333. Hard budget stop reserves 0.30 RMB before the 10 RMB ceiling; uncompleted runs are not model failures.

## Bayesian ceiling

| Stratum | n | Expected Bayes MAP | LLM actual |
|---|---|---|---|
| 1 | 30 | 29.91% | 13.33% |
| 2 | 30 | 26.16% | 3.33% |
| 3 | 30 | 22.70% | 3.33% |
| Visible | 35 | 38.57% | 28.57% |
| Occluded | 194 | 23.94% | 7.73% |
| 4+ | 104 | 21.93% | 8.65% |

Exact 12-state forward filter; condition only on legal sightings, own actions and survival/failure outcomes. Previous attempts are independent. Ceiling is mean max predictive posterior, not realized MAP success; ties broken lexicographically for realized score.

## Stale-rule matching

Wrong steps 165, applicable old-rule transitions 152, exact matches 3 (1.97%). Primary: apply previous parameters to actual current full internal state; outside previous range is null. This is an oracle-assisted counterfactual diagnostic, not evidence the model knew internal state. Also report marginal support over compatible old latent phases and same-elapsed-tick old trajectory. Matching is association, not proof of reliance.

[Quantitative breakdown, quoted reasons and corrected attribution table](LOCAL-DETAILS.md). [All wrong-step reasons](stale-rule-audit.json); [seed105 all attempts and explicit prior-reference flags](seed105-reasons.json). Text flags are candidate excerpts, not proof that old knowledge caused an error.

## Immediate Counterfactual Attribution

Only immediate fatal step; does not exclude earlier risk-management errors. Pure-random 12 failures are separately relabeled Stochastic Realization Error. [Corrected table](attribution-corrected.json).

Memory-off failure counts: {"Prediction Error":15}. Full per-episode records in subdirectories.

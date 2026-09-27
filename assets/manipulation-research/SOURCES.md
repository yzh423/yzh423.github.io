# Manipulation research media provenance

These are unaltered report figures, videos, and the PDF from the local `PID vs Fuzzy PID/.worktrees/research-v6-robust` checkout, except for two JPEG video posters extracted from recorded frames at 3.5 s (given path) and 1.5 s (endpoint only). The source checkout was at commit `a69288d` when this draft was assembled.

| Site asset | Source in research checkout | Evidence scope |
| --- | --- | --- |
| `r3-paired-timestep-stability.png` | `results/research-v8rs-r3-visual-evidence/statistical/paired_timestep_stability.png` | R3, all 40 refinement pairs |
| `r3-reliability-case-metrics.png` | `results/research-v8rs-r3-visual-evidence/statistical/reliability_case_metrics.png` | R3, three selected reliability cases |
| `r3-state-error-profiles.png` | `results/research-v8rs-r3-visual-evidence/traces/representative_state_error_profiles.png` | R3, one selected long-travel case |
| `r3-arrival-time-and-cost.png` | `results/research-v8rs-r3-visual-evidence/statistical/arrival_time_and_cost.png` | R3, one matched path/point draw |
| `r3-path-evidence.mp4` | `results/videos/research-v8rs-r3-path/research_v8rs_r3_path_evidence.mp4` | R3 recorded given-path simulation |
| `r3-point-evidence.mp4` | `results/videos/research-v8rs-r3-point/research_v8rs_r3_point_evidence.mp4` | R3 recorded endpoint-only simulation |
| `r3-technical-report.pdf` | `docs/report/research_v8rs_r3_technical_report.pdf` | R3 diagnostic report |
| `v8r-tracking-time-series.png` | `results/research-v8r/visual-evidence/tracking_time_series.png` | Earlier V8R validation example, not R3 |
| `v8r-bayesian-search.png` | `results/research-v8r/visual-evidence/training_candidate_landscape.png` | Earlier V8R search, not R3 |

The R3 source manifest is `results/research-v8rs-r3/generation-db4b6672-9f16-4d9f-962f-0aa4cb34b9c8/manifest.json` (SHA-256 `fd0532d6152a407feb78f367d82ee1ad370ac59df1a94a16e108b183c352dd79`). R3 used five preselected inputs, four frozen controllers, and three time profiles. It completed 60/60 runs and 40/40 finite refinement pairs; plant-only refinement was stable in 20/20 comparisons, whereas coupled plant-and-controller refinement was stable in 14/20 and sensitive in 6/20. No new controller was optimized or admitted, and confirmation was not run. These results do not establish hardware performance.

The older 126-case, 33.3% to 80.2% Fuzzy-PID metric belongs to the separate V6 feasible-execution protocol. It is intentionally not presented as an R3 outcome.

"""Add presentation-only tables and causal-scope notes to the verified report."""
from pathlib import Path
import json
root=Path('src/discrete/artifacts/vision-ablation');s=json.loads((root/'summary.json').read_text())
fmt=lambda m: f"{m['correct']}/{m['total']} ({100*m['accuracy']:.1f}%)" if m['total'] else 'N/A'
lines=['| Condition | Input | Pass | Player perception | Visible flag | Visible robot joint | Visible prediction | Occluded prediction | Format | Perception | Prediction | Planning | Requests | RMB |','|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|']
for g in s['groups']:
 b=g['textBaseline'];lines.append(f"| {g['condition']} | Text baseline | {b['success']}/4 | N/A | N/A | N/A | {fmt(b['visiblePrediction'])} | {fmt(b['occludedPrediction'])} | 0 | 0 | 0 | 0 | {b['requests']} | {b['costRMB']:.6f} |")
 f=g['fourClasses'];p=g['perception'];lines.append(f"| {g['condition']} | Current PNG + own history | {g['success']}/4 | {fmt(p['player'])} | {fmt(p['robotVisible'])} | {fmt(p['visibleRobotJoint'])} | {fmt(g['prediction']['visible'])} | {fmt(g['prediction']['occluded'])} | {f['format']} | {f['perception']} | {f['prediction']} | {f['planning']} | {g['requests']} | {g['costRMB']:.6f} |")
report=(root/'REPORT.md').read_text();start=report.index('| Condition | Input');end=report.index('\nVision total actual RMB:',start);report=report[:start]+'\n'.join(lines)+'\n'+report[end:]
report+='\n## Failure reasoning and scope\n\n'
for fail in s['failures']:
 r=json.loads((root/fail['id']/'run.json').read_text());step=r['steps'][-1];d=step['decision'];report+=f"- {fail['id']}: perceived_current={json.dumps(d['perceived_current'])}; predicted_next={json.dumps(d['predicted_next'])}; action={d['action']}. Model reason: {d['reason']}\n"
report+='\nThe sole observed failure predicted the reversal correctly, then entered the northward vision ray at the crossing. The opaque door lies on the west edge of that crossing and does not block the robot-to-player ray along its patrol column. Under the requested schema this is Action/Planning Error. Perception scoring measures actor coordinates, heading and visibility; it does not separately test door/occlusion semantic interpretation. Four phases with one attempt each do not isolate a statistically significant modality effect.\n\n[Verification](verification.json) · [Three previews](preview/) · [Implementation and reproduction](../../vision/README.md)\n'
(root/'REPORT.md').write_text(report)
print('Main table now includes all four failure classes; added original fatal-step reasoning.')

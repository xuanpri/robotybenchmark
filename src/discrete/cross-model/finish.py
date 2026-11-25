"""Offline presentation / partial-history completion. No model requests."""
from pathlib import Path
import json
root=Path('src/discrete/artifacts/cross-model-v1');summary=json.loads((root/'summary.json').read_text())
for run in root.glob('*/[ABC]-*/run.json'):
    data=json.loads(run.read_text());data['executionStatus']='incomplete' if data['outcome']=='running' else 'complete'
    run.write_text(json.dumps(data,ensure_ascii=False,indent=2))
    (run.parent/'public-history.json').write_text(json.dumps(data['public'],ensure_ascii=False,indent=2))
text=(root/'REPORT.md').read_text()
text+='\n## Coverage and interpretation\n\n'
for stop in summary.get('stops',[]):
    text+=f"- {stop['model']}: {stop['reason']}, actual gateway charge RMB {stop['cost']['actualRMB']:.6f}. No incomplete trial was assigned a model-failure category.\n"
text+=f"\nActive slice scope: {', '.join(summary.get('selectedSlices',['A','B','C']))}. Deferred: {', '.join(summary.get('deferredSlices',[])) or 'none'}.\n"
text+='\nCurves from incomplete cohorts are lower bounds, not six-seed final pass rates. Capped means are N/A until all cases complete. Missing visual main trials cannot be replaced by their successful single-image connectivity preflight. Slice order follows the selected scope; this continuation explicitly defers B (cost control). No cross-model ranking is justified from unequal incomplete coverage.\n'
text+='\nPrompt protocol uses the original maxAttempts=5 verbatim while execution stops after attempt3. This matches the read-only GPT cap3 truncation; shortening the prompt to maxAttempts=3 would change the control. Model histories and trajectories naturally diverge with their own choices, but factories, serialization and observation rules are shared exactly.\n'
text+='\n## Objective observations for selected slices\n\n'
for g in summary['groups']:
 if g['slice']=='A':
  w=g['windowObservation'];text+=f"- {g['model']}: mean first-attempt window observation decisions {w['firstAttemptMeanWindowSteps']:.2f}, first-pass {g['pass'][0]['success']}/6, occluded prediction {g['occluded']['correct']}/{g['occluded']['total']}; capped attempt mean {g['restrictedMeanAtCap']}.\n"
 if g['slice']=='C':
  p=g['perception'];text+=f"- {g['model']} C: pass {g['pass'][0]['success']}/4, actor perception counts {p}, occluded prediction {g['occluded']}, immediate attribution {g['attribution']}.\n"
text+='\nWindow counts include the departure decision because its input is still a legal window observation. These six-seed single-run observations do not identify a causal benefit from extra waiting. Actor perception metrics do not separately measure interpretation of door geometry or occlusion semantics; planning labels must be read within that scope.\n'
text+='\n## Visual failure evidence\n\n'
visual=[]
for f in Path('src/discrete/artifacts/vision-ablation').glob('partial-known-vision-*/run.json'):
 r=json.loads(f.read_text())
 if r.get('category'):visual.append(('gpt-5.6-sol',r,'../vision-ablation/'))
for f in root.glob('*/C-*/run.json'):
 r=json.loads(f.read_text())
 if r.get('category'):visual.append((r['model'],r,f.parent.parent.name+'/'))
for model,r,prefix in visual:
 last=r['steps'][-1];d=last['decision'];text+=f"- {model} {r['id']}: {r['category']}; prediction correct={last.get('predictionCorrect')}, actor perception={last.get('perception')}; action={d['action']}. Reason: {d['reason']} [input frame]({prefix+last['frame']})\n"
text+='\nThe Gemini phase-4 reason explicitly recognizes that RIGHT enters the sight ray, but the action field remains RIGHT. This is an action/reason inconsistency under the unchanged protocol, not a demonstrated inability to perceive the robot or identify that danger. The GPT phase-0 reason instead invokes door protection at the crossing. These different planning failures must not be collapsed into a single visual-perception explanation.\n'
text+='\n[Verification](verification.json) · [Comparison SVG](cross-model-comparison.svg) · [Implementation](../../cross-model/README.md)\n'
(root/'REPORT.md').write_text(text)
print('Completed public-history sidecars and coverage notes')

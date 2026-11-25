import os
os.environ.setdefault('MPLCONFIGDIR','/tmp/discrete-cross-model-mpl')
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path('src/discrete/artifacts/cross-model-v1');s=json.loads((root/'summary.json').read_text());models=s['models'];colors=['#2878b5','#d87524','#388542']
fig=plt.figure(figsize=(14,6),layout='constrained');outer=fig.add_gridspec(1,2,width_ratios=[1.15,1]);left=outer[0].subgridspec(2,2)
labels=[m.replace('gpt-5.6-sol','GPT').replace('claude-opus-5-5','Claude').replace('gemini-4-argon','Gemini') for m in models]
for col,sl in enumerate(['A','B']):
 ax=fig.add_subplot(left[0,col]);bar=fig.add_subplot(left[1,col])
 for j,m in enumerate(models):
  g=next(g for g in s['groups'] if g['model']==m and g['slice']==sl)
  if g['complete']:ax.plot([p['k'] for p in g['pass']],[p['success']/p['total'] for p in g['pass']],'o-',color=colors[j],label=labels[j])
  elif g['requests']:
   ax.plot([p['k'] for p in g['pass']],[p['success']/p['total'] for p in g['pass']],color=colors[j],linestyle='--',marker='o',markerfacecolor='none',label=labels[j]+' lower bound')
  else:ax.plot([],[],color=colors[j],linestyle='--',label=labels[j]+' not measured')
  v=g['occluded']['accuracy'];bar.bar(j,np.nan if v is None else v,color=colors[j]);bar.text(j, .03 if v is None else min(v+.025,1.02),'N/A' if v is None else f'{100*v:.1f}%'+(' *' if not g['complete'] else ''),ha='center',fontsize=8)
 ax.set(title=('Slice B: Deferred (cost control)' if sl in s.get('deferredSlices',[]) else 'Slice '+sl+': Pass@1..3'),xticks=[1,2,3],ylim=(-.03,1.05),xlabel='Attempt budget',ylabel='Success / 6');ax.grid(alpha=.2);ax.legend(fontsize=7)
 bar.set(title='Slice '+sl+': occluded prediction',xticks=range(3),xticklabels=labels,ylim=(0,1.1),xlim=(-.6,2.6),ylabel='Joint accuracy');bar.grid(axis='y',alpha=.2)
right=fig.add_subplot(outer[1]);names=['Player pos','Visible flag','Robot joint','Occl. pred','Pass@1'];x=np.arange(len(names));w=.24
for j,m in enumerate(models):
 g=next(g for g in s['groups'] if g['model']==m and g['slice']=='C');p=g['perception'];values=[p['player']['accuracy'],p['robotVisible']['accuracy'],p['robotJoint']['accuracy'],g['occluded']['accuracy'],g['pass'][0]['success']/4 if g['complete'] else None]
 right.bar(x+(j-1)*w,[np.nan if v is None else v for v in values],width=w,color=colors[j],label=labels[j]+(' incomplete' if not g['complete'] else ''))
right.set(title='Slice C: perception, prediction and success',xticks=x,xticklabels=names,ylim=(0,1.12),xlim=(-.6,4.6),ylabel='Accuracy / success rate');right.legend();right.grid(axis='y',alpha=.2)
missing=[labels[j] for j,m in enumerate(models) if not next(g for g in s['groups'] if g['model']==m and g['slice']=='C')['complete']]
if missing:right.text(.02,.96,'N/A main cohort: '+', '.join(missing),transform=right.transAxes,fontsize=8,va='top')
fig.suptitle('Cross-model golden slices · zero new GPT requests · dashed: incomplete lower bounds; * partial steps')
fig.savefig(root/'cross-model-comparison.svg');fig.savefig(root/'cross-model-comparison.png',dpi=140)
print('Wrote comparison SVG and PNG')

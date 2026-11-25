"""Plot recorded metrics only; never calls a model or changes experiment data."""
import os
os.environ.setdefault('MPLCONFIGDIR', '/tmp/discrete-phase22-mpl')
import json
import math
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'src/discrete/artifacts/phase2-v2')
data = json.loads((root / 'summary.json').read_text())
if not data['complete']:
    raise SystemExit('Refusing to publish incomplete curves')
modes = ['identical_loop', 'parametric_shift', 'pattern_shift', 'pure_random']
colors = {'Partial-unknown-passive': '#2878b5', 'Partial-unknown-interactive': '#d87524'}
fig, axes = plt.subplots(2, 2, figsize=(11, 7), constrained_layout=True)
for ax, mode in zip(axes.flat, modes):
    for group in data['groups']:
        if group['mode'] != mode or group['condition'] == 'Omniscient':
            continue
        p = group['pass']
        ax.plot([x['k'] for x in p], [x['rate'] for x in p], marker='o', color=colors[group['condition']], label=group['condition'].replace('Partial-unknown-', ''))
    ax.set(title=mode, xlabel='Attempt budget k', ylabel='Pass@k (6 seeds)', xticks=range(1, 6), yticks=[0, 1/3, 2/3, 1], ylim=(-.04, 1.06))
    if mode == 'pure_random':
        for b, style in zip(data['randomDrift']['baselineComparisons'], ['--', ':', '-.']):
            ax.plot(range(1, 6), [p['rate'] for p in b['cumulativeChancePass']], linestyle=style, linewidth=.8, color='#888888', label=b['policy'] + ' chance')
    ax.grid(alpha=.25)
    ax.legend(loc='lower right', fontsize=7)
fig.suptitle('Phase 2.2: cumulative first success; random trials continue after success')
fig.savefig(root / 'pass-curves.svg')
fig.savefig(root / 'pass-curves.png', dpi=140)
plt.close(fig)

rounds = data['randomDrift']['rounds']
x = [r['attempt'] for r in rounds]
fig, axes = plt.subplots(2, 2, figsize=(11, 7), constrained_layout=True)
ax = axes[0, 0]
y = [r['rate'] for r in rounds]
lo = [r['ci95'][0] for r in rounds]
hi = [r['ci95'][1] for r in rounds]
ax.errorbar(x, y, yerr=[[a-b for a,b in zip(y,lo)], [a-b for a,b in zip(hi,y)]], marker='o', color='#2878b5', label='LLM (6 per round), Wilson 95%')
for b, color in zip(data['randomDrift']['baselineComparisons'], ['#777777', '#d87524', '#388542']):
    ax.axhline(b['exactP'], color=color, linewidth=1, linestyle='--', label=b['policy'] + ' exact p')
    ax.fill_between(x, [b['ci95'][0]]*5, [b['ci95'][1]]*5, color=color, alpha=.05)
ax.set(title='Pure random: single-round success', ylim=(-.03, 1.03), ylabel='Success rate')
ax.legend(fontsize=6)
axes[0, 1].plot(x, [r['actionEntropyBits'] for r in rounds], 'o-', color='#8b56a5')
axes[0, 1].set(title='Pooled action distribution entropy', ylabel='Bits (log2)', ylim=(0, math.log2(5)))
axes[1, 0].plot(x, [r['meanPocketWaitTicks'] for r in rounds], 'o-', color='#d87524')
axes[1, 0].set(title='Mean WAIT ticks at observation window', ylabel='Ticks per episode')
axes[1, 1].bar(x, [r['patternLanguageCount'] for r in rounds], color='#777777')
axes[1, 1].set(title='Pattern-language flags (not a diagnosis)', ylabel='Flagged reasons')
axes[1, 1].set_ylim(0, max(1, max(r['patternLanguageCount'] for r in rounds) * 1.15))
for ax in axes.flat:
    ax.set(xlabel='Attempt index (no early stopping)', xticks=range(1, 6))
    ax.grid(alpha=.2)
fig.suptitle('Descriptive drift: reference policies are not an optimal-policy ceiling')
fig.savefig(root / 'random-drift.svg')
fig.savefig(root / 'random-drift.png', dpi=140)
plt.close(fig)

fig, axes = plt.subplots(2, 2, figsize=(11, 7), constrained_layout=True)
for ax, mode in zip(axes.flat, modes):
    for g in data['groups']:
        if g['mode'] != mode or g['condition'] == 'Omniscient':
            continue
        metrics = [g['age'][age] for age in ['1', '2', '3', '4+']]
        yy = [r['accuracy'] if r['total'] else float('nan') for r in metrics]
        color = colors[g['condition']]
        ax.plot(range(4), yy, 'o-', color=color, label=g['condition'].replace('Partial-unknown-', ''))
        for j, (value, metric) in enumerate(zip(yy, metrics)):
            if metric['total']:
                ax.annotate(f"{metric['correct']}/{metric['total']}", (j, value), xytext=(0, 6 if color == '#2878b5' else -13), textcoords='offset points', ha='center', fontsize=7, color=color)
    ax.set(title=mode, xticks=range(4), xticklabels=['1', '2', '3', '4+'], xlabel='Ticks since last legal sighting', ylabel='Joint position + heading accuracy', ylim=(-.05, 1.14))
    ax.grid(alpha=.25)
    ax.legend(fontsize=8, loc='lower left')
fig.suptitle('Occluded prediction accuracy: different policies select different age cohorts')
fig.savefig(root / 'prediction-age.svg')
fig.savefig(root / 'prediction-age.png', dpi=140)
plt.close(fig)
print('Wrote pass-curves.svg, random-drift.svg, prediction-age.svg')

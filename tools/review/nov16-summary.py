"""Print the archived cohort tables. No game state or existing report is changed."""
import collections
import json
from pathlib import Path
from statistics import mean

root = Path(__file__).parent
rows = []
for name in ['reactive', 'latency', 'planned']:
    rows.extend(json.loads((root / f'nov16-{name}.json').read_text()))
groups = collections.defaultdict(list)
for row in rows:
    groups[row['type']].append(row)
aliases = {
    'Rusher 60Hz': 'Rush 60 Hz', 'Rush 5Hz': 'Rush 5 Hz', 'Rush 3Hz': 'Rush 3 Hz',
    'Shove-grab': 'Force', 'Shove-grab 250ms': 'Force +250 ms', 'Shove-grab 500ms': 'Force +500 ms',
}
print('All averages include every attempt, including the two unfinished intel attempts.')
print('Time left is game seconds, not wall time; departure waiting and solitary costs are included.\n')
print('| Strategy | Wins / attempts | Mean left, s | Mean spots | Solitary trips | Capture rooms |')
print('| --- | --- | --- | --- | --- | --- |')
for name, cohort in groups.items():
    n = len(cohort)
    wins = sum(r['won'] for r in cohort)
    unresolved = sum(r['outcome'] is None for r in cohort)
    rate = f'{wins}/{n}' + ('*' if unresolved else f' ({wins / n:.0%})')
    captures = collections.Counter(c['room'] for r in cohort for c in r['observation']['captures'])
    caught = ', '.join(f'{k}: {v}' for k, v in captures.items()) or 'None'
    avg = lambda field: mean(r[field] for r in cohort)
    print(f"| {aliases.get(name, name)} | {rate} | {avg('timeLeft'):.2f} | {avg('timesSpotted'):.2f} | "
          f"{sum(r['solitary'] for r in cohort)} | {caught} |")
print('\n*Intel: four wins, two unfinished attempts after solitary; neither is a final game loss.\n')
print('Captures count solitary admissions plus final Caught outcomes; escaped grabs are excluded.\n')
print('| Strategy | Mean spotted by source | Mean KOs R/A/P/L | Mean shoves |')
print('| --- | --- | --- | --- |')
source_codes = {'guard': 'G', 'camera': 'C', 'searchlight': 'L', 'snitch': 'S', 'shove': 'H',
                'brokeFree': 'B', 'sleeperWoke': 'W', 'emptyBed': 'E', 'other': 'O'}
for name, cohort in groups.items():
    sources = []
    for source, code in source_codes.items():
        avg = mean(r['spottedBy'][source] for r in cohort)
        if avg:
            sources.append(f'{code} {avg:.2f}')
    ko = '/'.join(f"{mean(r['takedowns'][k] for r in cohort):.2f}" for k in ['choke', 'above', 'pullIn', 'ledge'])
    shoves = mean(r['shoves'] for r in cohort)
    print(f"| {aliases.get(name, name)} | {', '.join(sources) or 'All zero'} | {ko} | {shoves:.2f} |")
print('\nSource codes: G guards, C cameras, L searchlights, S snitches, H your shoves, B guard broke free,')
print('W sleeper woke, E empty bed, O other. Every omitted source is zero for that strategy.')
print('KO types: R rear/held knockout (score `choke`), A above, P pull into hiding, L ledge.')
print('A shove is an action; only a new Alert attributable to it adds a shove spotting.')

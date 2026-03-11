#!/usr/bin/env bash
# n8n-check.sh — Letzte Execution(s) eines Workflows pruefen
# Usage: bash n8n-check.sh [workflowId] [limit]
#
# Ohne Argumente: zeigt alle letzten Executions
# Mit workflowId: nur diesen Workflow
# Mit limit: Anzahl (default: 3)

set -euo pipefail

API_KEY=$(python -c "import json,os; c=json.load(open(os.path.expanduser('~/AppData/Roaming/n8nac-nodejs/Config/credentials.json'))); print(c['hosts']['http://localhost:5678'])")
BASE="http://localhost:5678/api/v1"
WF_ID="${1:-}"
LIMIT="${2:-3}"

if [ -n "$WF_ID" ]; then
    QUERY="workflowId=$WF_ID&limit=$LIMIT&includeData=true"
else
    QUERY="limit=$LIMIT&includeData=true"
fi

PYTHONIOENCODING=utf-8 python -c "
import sys, json, urllib.request

api_key = '$API_KEY'
base = '$BASE'
query = '$QUERY'

req = urllib.request.Request(f'{base}/executions?{query}', headers={'X-N8N-API-KEY': api_key})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read()).get('data', [])

if not data:
    print('Keine Executions gefunden.')
    sys.exit(0)

for e in data:
    eid = e['id']
    status = e['status']
    wf_name = e.get('workflowData', {}).get('name', e.get('workflowId', '?'))
    icon = '[OK]' if status == 'success' else '[FAIL]' if status == 'error' else '[...]'
    print(f'\n{icon} Execution #{eid} | {wf_name} | {status}')
    print('-' * 60)

    rd = e.get('data', {}).get('resultData', {})
    if not rd:
        print('  (keine Details verfuegbar)')
        continue

    for node_name, node_data in rd.get('runData', {}).items():
        for run in node_data:
            if run.get('error'):
                err = run['error']
                msg = err.get('message', '?')
                desc = err.get('description', '')
                print(f'  FAIL {node_name}: {msg}')
                if desc:
                    for line in desc[:500].split('\n'):
                        print(f'       {line}')
            elif run.get('data', {}).get('main'):
                branches = run['data']['main']
                for bi, branch in enumerate(branches):
                    if branch:
                        items = len(branch)
                        preview = json.dumps(branch[0].get('json', {}), ensure_ascii=True)[:120]
                        suffix = f' (+{items-1} more)' if items > 1 else ''
                        print(f'  OK   {node_name}: {preview}{suffix}')
"

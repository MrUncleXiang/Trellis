"""A review only: reproduce current start/validate boundaries in isolated fixtures.
Run from repository root. No product files, task states or Git settings are changed.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile

root = Path.cwd()
base = '9b76fe49f19de4d383dd4677fea803e2f2da7004'
out = root / '.trellis/tasks/11-11-planning-artifact-gate/research/current-behavior-evidence'
out.mkdir(parents=True, exist_ok=True)
tmp = Path(tempfile.mkdtemp(prefix='trellis-a-review-'))
archive = subprocess.check_output(['git', 'archive', base, 'packages/cli/src/templates/trellis/scripts', 'packages/cli/src/templates/trellis/workflow.md'], cwd=root)
with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as tf:
    tf.extractall(tmp / 'source', filter='data')
source = tmp / 'source/packages/cli/src/templates/trellis'
base_env = {k: v for k, v in os.environ.items() if k.upper() in {'PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PATHEXT', 'COMSPEC', 'PYTHONHOME'}}
base_env.update({'TRELLIS_DEVELOPER': 'review-fixture', 'PYTHONIOENCODING': 'utf-8'})
cases = [
 {'id': 'prd-only-no-manifests', 'status': 'planning', 'files': 'prd', 'manifests': None, 'command': 'start'},
 {'id': 'missing-prd-curated', 'status': 'planning', 'files': None, 'manifests': 'curated', 'command': 'start'},
 {'id': 'three-empty-files-curated', 'status': 'planning', 'files': 'empty', 'manifests': 'curated', 'command': 'start'},
 {'id': 'empty-manifests', 'status': 'planning', 'files': 'prd', 'manifests': 'empty', 'command': 'start'},
 {'id': 'empty-manifests-explicit-bypass', 'status': 'planning', 'files': 'prd', 'manifests': 'empty', 'command': 'start', 'flags': ['--allow-empty-context']},
 {'id': 'corrupt-task-json', 'status': 'corrupt', 'files': None, 'manifests': 'curated', 'command': 'start'},
 {'id': 'no-session-identity', 'status': 'planning', 'files': 'prd', 'manifests': None, 'command': 'start', 'no_session': True},
 {'id': 'resume-in-progress-empty-manifests', 'status': 'in_progress', 'files': 'prd', 'manifests': 'empty', 'command': 'start'},
 {'id': 'validate-no-planning-files', 'status': 'planning', 'files': None, 'manifests': 'curated', 'command': 'validate'},
 {'id': 'create-targets-planning', 'status': 'new', 'files': None, 'manifests': None, 'command': 'create'},
]
rows = []
for case in cases:
    repo = tmp / case['id']
    (repo / '.trellis/tasks').mkdir(parents=True)
    shutil.copytree(source / 'scripts', repo / '.trellis/scripts')
    shutil.copyfile(source / 'workflow.md', repo / '.trellis/workflow.md')
    (repo / '.trellis/config.yaml').write_text('session_auto_commit: false\n', encoding='utf8')
    (repo / '.trellis/spec').mkdir()
    (repo / '.trellis/spec/review.md').write_text('# Fixture spec\nDo not change product files.\n', encoding='utf8')
    subprocess.run(['git', 'init', '-q'], cwd=repo, check=True)
    task = repo / '.trellis/tasks/review-case'
    env = base_env.copy()
    if not case.get('no_session'):
        env['TRELLIS_CONTEXT_ID'] = 'review-' + case['id']
    if case['command'] != 'create':
        task.mkdir()
        record = {'id': 'review-case', 'name': 'review-case', 'title': 'Fixture', 'description': 'Review only', 'status': case['status'], 'branch': None, 'base_branch': None, 'meta': {}}
        (task / 'task.json').write_text('{ not valid json' if case['status'] == 'corrupt' else json.dumps(record, indent=2), encoding='utf8')
        if case['files'] == 'prd':
            (task / 'prd.md').write_text('# Requirement\nChange a local prompt only.\n', encoding='utf8')
        elif case['files'] == 'empty':
            for name in ['prd.md', 'design.md', 'implement.md']:
                (task / name).write_text('', encoding='utf8')
        if case['manifests'] is not None:
            for name in ['implement.jsonl', 'check.jsonl']:
                (task / name).write_text('' if case['manifests'] == 'empty' else json.dumps({'file': '.trellis/spec/review.md', 'reason': 'Fixture contract'}) + '\n', encoding='utf8')
    before = {p.name: p.read_text(encoding='utf8') for p in task.glob('*') if p.is_file()} if task.exists() else {}
    args = [sys.executable, '.trellis/scripts/task.py']
    args += ['create', 'Review planning', '--description', 'Review only', '--slug', 'review-planning'] if case['command'] == 'create' else [case['command'], '.trellis/tasks/review-case'] + case.get('flags', [])
    result = subprocess.run(args, cwd=repo, env=env, capture_output=True, text=True, encoding='utf8', timeout=30)
    if case['command'] == 'create':
        task = next(p for p in (repo / '.trellis/tasks').iterdir() if p.is_dir() and p.name != 'archive')
    after = {p.name: p.read_text(encoding='utf8') for p in task.glob('*') if p.is_file()}
    try:
        after_status = json.loads(after.get('task.json', '{}')).get('status')
    except json.JSONDecodeError:
        after_status = 'corrupt'
    session_dir = repo / '.trellis/.runtime/sessions'
    pointers = [json.loads(p.read_text(encoding='utf8')).get('current_task') for p in session_dir.glob('*.json')] if session_dir.is_dir() else []
    row = {'case': case, 'command': args, 'exit': result.returncode, 'statusAfter': after_status, 'activePointers': pointers, 'stdout': result.stdout, 'stderr': result.stderr, 'before': before, 'after': after}
    (out / (case['id'] + '.json')).write_text(json.dumps(row, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    rows.append({'id': case['id'], 'exit': result.returncode, 'statusAfter': after_status, 'pointerCount': len(pointers)})
# Logical counterexample to the proposed fingerprint-only check; not a test of an implemented gate.
materials = {'prd.md': 'Requirement: keep data local and offline.\n', 'design.md': 'Design: upload data to a remote API.\n', 'implement.md': 'Plan: implement remote upload.\n'}
recorded = {k: hashlib.sha256(v.replace('\r\n', '\n').encode()).hexdigest() for k, v in materials.items()}
comparison = {'materials': materials, 'recordedHashes': recorded, 'recomputedHashes': recorded.copy(), 'allHashesMatch': True, 'semanticConflict': 'Offline-only requirement conflicts with a remote-upload design and plan.', 'kind': 'logical counterexample only; A is not implemented'}
(out / 'fingerprint-counterexample.json').write_text(json.dumps(comparison, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
summary = {'baseline': base, 'runtime': sys.version, 'fixtureRoot': str(tmp), 'scope': 'committed template scripts only, no product changes', 'cases': rows, 'counterexample': comparison['kind']}
(out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps(summary, ensure_ascii=False, indent=2))

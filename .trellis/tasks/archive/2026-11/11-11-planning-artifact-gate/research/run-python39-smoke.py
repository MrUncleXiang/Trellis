from pathlib import Path
import json, os, shutil, subprocess, tempfile
root = Path.cwd()
runtime = Path(os.environ['TEMP']) / 'trellis-planning-python39/python.exe'
repo = Path(tempfile.mkdtemp(prefix='trellis-a-python39-'))
scripts = repo / '.trellis/scripts'
shutil.copytree(root / 'packages/cli/src/templates/trellis/scripts', scripts)
task = repo / '.trellis/tasks/smoke'
task.mkdir(parents=True)
(task / 'task.json').write_text(json.dumps({'status': 'planning', 'meta': {'other': 'preserve'}, 'unknownTop': 'preserve'}), encoding='utf-8')
(repo / '.trellis/config.yaml').write_text('session_auto_commit: false\n', encoding='utf-8')
for name in ('prd.md', 'design.md', 'implement.md'):
    (task / name).write_text('# ' + name + '\nKeep storage local.\n', encoding='utf-8')
env = {k: v for k, v in os.environ.items() if k.upper() in {'PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PATHEXT', 'COMSPEC'}}
env.update(PYTHONIOENCODING='utf-8', TRELLIS_CONTEXT_ID='py39-smoke')
rows = []
def run(args):
    wrapper = "import sys,runpy;sys.path.insert(0,sys.argv[1]);sys.argv=sys.argv[2:];runpy.run_path(sys.argv[0],run_name='__main__')"
    p = subprocess.run([str(runtime), '-c', wrapper, str(scripts), str(scripts/'task.py'), *args], cwd=repo, env=env, capture_output=True, text=True, encoding='utf-8', timeout=20)
    rows.append({'args': args, 'exit': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr})
run(['attest', '.trellis/tasks/smoke', '--note', 'Actual Python3.9 reviewed fixture'])
run(['validate', '.trellis/tasks/smoke'])
d = json.loads((task/'task.json').read_text(encoding='utf-8'))
version = d.get('meta', {}).get('planningAttest', {}).get('reviewId', 'missing')
run(['start', '.trellis/tasks/smoke', '--review', version, '--approval-note', 'Fixture reply approves reviewed version', '--approval-source', 'Fixture after review'])
run(['planning-status', '.trellis/tasks/smoke', '--json'])
report = {'python': subprocess.check_output([str(runtime), '--version'], text=True).strip(), 'interpreter': str(runtime), 'fixture': str(repo), 'note': 'Embeddable Python excludes script directory: runpy wrapper adds only fixture scripts path, no business logic mocked.', 'rows': rows, 'final': json.loads((task/'task.json').read_text(encoding='utf-8'))}
out = root / '.trellis/tasks/11-11-planning-artifact-gate/research/python39-smoke-current.json'
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'python': report['python'], 'exits': [r['exit'] for r in rows], 'status': report['final']['status']}, ensure_ascii=False))

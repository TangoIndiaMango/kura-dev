"""Sweep parity: clone the dev DB twice (template kura_sweeps_base), build the
same fixture in both through Django's ORM, run Django's job on one and the Go
worker (--once --json --only=JOB) on the other, then compare the job results
and the rows the job touches. Usage: run.py [job ...]"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib import DJANGO_DIR, check, summary  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
ENV = dict(line.split("=", 1) for line in open(os.path.join(ROOT, "infra", ".env")).read().splitlines()
           if line and not line.startswith("#") and "=" in line)
URL = ENV["DATABASE_URL"].strip().strip('"')
BASE_URL, MAIN = URL.rsplit("/", 1)
TEMPLATE = "kura_sweeps_base"


def psql(db, sql, at=True):
    args = ["psql", f"{BASE_URL}/{db}", "-v", "ON_ERROR_STOP=1", "-c", sql] + (["-At", "-F", "\t"] if at else [])
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def build_template():
    psql(MAIN, f"DROP DATABASE IF EXISTS {TEMPLATE}")
    psql(MAIN, f"CREATE DATABASE {TEMPLATE}")
    dump = subprocess.Popen(["pg_dump", "--no-owner", URL], stdout=subprocess.PIPE)
    subprocess.run(["psql", f"{BASE_URL}/{TEMPLATE}", "-q", "-v", "ON_ERROR_STOP=1"], stdin=dump.stdout, check=True,
                   capture_output=True)
    dump.wait()


def fresh(db):
    psql(MAIN, f"DROP DATABASE IF EXISTS {db} WITH (FORCE)")
    psql(MAIN, f"CREATE DATABASE {db} TEMPLATE {TEMPLATE}")


def django(db, code, extra_env=None):
    env = {**os.environ, "DATABASE_URL": f"{BASE_URL}/{db}", "MOCK_IOT_ENABLED": "true", **(extra_env or {})}
    out = subprocess.run(["uv", "run", "python", "manage.py", "shell", "-c", code], cwd=DJANGO_DIR,
                         env=env, capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"django failed:\n{out.stderr[-3000:]}")
    return out.stdout


def go_worker(db, job):
    env = {**os.environ, "DATABASE_URL": f"{BASE_URL}/{db}", "MOCK_IOT_ENABLED": "true"}
    out = subprocess.run([os.path.join(ROOT, "backend", "scripts", "worker.sh"), "--once", "--json", f"--only={job}"],
                         env=env, capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"go worker failed:\n{out.stderr[-3000:]}")
    return json.loads(out.stdout.strip().splitlines()[-1])[job]


def fixture(db, name):
    code = open(os.path.join(HERE, "fixtures.py")).read()
    out = django(db, code, {"SWEEP_FIXTURE": name})
    assert "fixture-ok" in out, out


def rows(db, sql):
    return [tuple(line.split("\t")) for line in psql(db, sql).splitlines()]


def compare(job, dj_code, snapshots, fixture_name=None, scrub=()):
    fresh("kura_sweeps_dj")
    fresh("kura_sweeps_go")
    if fixture_name:
        fixture("kura_sweeps_dj", fixture_name)
        fixture("kura_sweeps_go", fixture_name)
    dj = json.loads(django("kura_sweeps_dj", "import json\n" + dj_code).strip().splitlines()[-1])
    go = go_worker("kura_sweeps_go", job)
    check(f"{job}: result", (200, dj), (200, go), extra=scrub)
    for name, sql in snapshots.items():
        check(f"{job}: {name}", (200, rows("kura_sweeps_dj", sql)), (200, rows("kura_sweeps_go", sql)))


if __name__ == "__main__":
    from jobs import JOBS
    wanted = sys.argv[1:] or list(JOBS)
    build_template()
    for job in wanted:
        JOBS[job](compare)
    for db in ("kura_sweeps_dj", "kura_sweeps_go", TEMPLATE):
        psql(MAIN, f"DROP DATABASE IF EXISTS {db} WITH (FORCE)")
    sys.exit(1 if summary() else 0)

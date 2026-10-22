#!/usr/bin/env python3
"""Self-tests for the cross-platform project quality gate."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().with_name("invoke_project_quality_gate.py")


def python_command(exit_code: int) -> str:
    escaped_executable = str(Path(sys.executable)).replace('"', '\\"')
    return f'"{escaped_executable}" -c "import sys; sys.exit({exit_code})"'


def run_gate(project_root: Path, report_name: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT_PATH), str(project_root), "--profile", "full", "--report", str(project_root / report_name)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def write_config(project_root: Path, checks: list[dict[str, object]]) -> None:
    config_path = project_root / ".ai" / "quality-gate.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({"schemaVersion": 1, "checks": checks}, indent=2), encoding="utf-8")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="quality-gate-test-") as temporary_directory:
        project_root = Path(temporary_directory)

        write_config(
            project_root,
            [
                {"name": "pass", "profiles": ["quick", "full"], "command": python_command(0), "required": True, "notApplicableReason": "", "timeoutSeconds": 30},
                {"name": "skip", "profiles": ["full"], "command": "", "required": False, "notApplicableReason": "Not used in this fixture.", "timeoutSeconds": 30},
            ],
        )
        passed = run_gate(project_root, "pass-report.json")
        pass_report = json.loads((project_root / "pass-report.json").read_text(encoding="utf-8"))
        assert passed.returncode == 0, passed.stderr
        assert pass_report["status"] == "passed"
        assert len(pass_report["checks"]) == 2
        assert pass_report["platform"] == sys.platform

        write_config(
            project_root,
            [
                {"name": "fail", "profiles": ["full"], "command": python_command(7), "required": True, "notApplicableReason": "", "timeoutSeconds": 30},
                {"name": "must-not-run", "profiles": ["full"], "command": python_command(0), "required": True, "notApplicableReason": "", "timeoutSeconds": 30},
            ],
        )
        failed = run_gate(project_root, "fail-report.json")
        fail_report = json.loads((project_root / "fail-report.json").read_text(encoding="utf-8"))
        assert failed.returncode == 1
        assert fail_report["status"] == "failed"
        assert len(fail_report["checks"]) == 1
        assert fail_report["checks"][0]["exitCode"] == 7

    print("Cross-platform quality gate tests: PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

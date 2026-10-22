#!/usr/bin/env python3
"""Run a project's configured quality checks on Windows, macOS, or Linux."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REDACTIONS = (
    (re.compile(r"gh[opsu]_[A-Za-z0-9]{20,}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"(?i)(authorization:\s*bearer\s+)[^\s]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)((?:password|secret|token)\s*[:=]\s*)[^\s]+"), r"\1[REDACTED]"),
)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_path", help="Absolute or relative project directory")
    parser.add_argument("--profile", choices=("quick", "full"), default="full")
    parser.add_argument("--config", help="Config path; defaults to .ai/quality-gate.json")
    parser.add_argument("--report", help="Report path; defaults to the system temporary directory")
    return parser.parse_args()


def redact(text: str) -> str:
    result = text[-12000:]
    for pattern, replacement in REDACTIONS:
        result = pattern.sub(replacement, result)
    return result


def git_commit(project_root: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(project_root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        return result.stdout.strip() or None
    except (OSError, subprocess.CalledProcessError):
        return None


def resolve_path(project_root: Path, value: str | None, default: Path) -> Path:
    if not value:
        return default
    path = Path(value).expanduser()
    return path.resolve() if path.is_absolute() else (project_root / path).resolve()


def main() -> int:
    arguments = parse_arguments()
    project_root = Path(arguments.project_path).expanduser().resolve(strict=True)
    if not project_root.is_dir():
        raise NotADirectoryError(project_root)

    config_path = resolve_path(project_root, arguments.config, project_root / ".ai" / "quality-gate.json")
    if not config_path.is_file():
        raise FileNotFoundError(f"Quality gate config not found: {config_path}")

    config = json.loads(config_path.read_text(encoding="utf-8-sig"))
    if config.get("schemaVersion") != 1:
        raise ValueError(f"Unsupported quality gate schemaVersion: {config.get('schemaVersion')}")
    if not isinstance(config.get("checks"), list):
        raise ValueError("Quality gate config must contain a checks array.")

    default_report = Path(tempfile.gettempdir()) / "ai-software-studio-quality-gates" / f"quality-gate-{uuid.uuid4().hex}.json"
    report_path = resolve_path(project_root, arguments.report, default_report)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    started_at = datetime.now(timezone.utc).isoformat()
    results: list[dict[str, Any]] = []
    overall_status = "passed"

    for check in config["checks"]:
        if arguments.profile not in check.get("profiles", []):
            continue

        name = str(check.get("name", "")).strip()
        command = str(check.get("command", "")).strip()
        required = bool(check.get("required", False))
        timeout_seconds = max(int(check.get("timeoutSeconds", 600)), 1)

        if not name:
            raise ValueError("Every quality check must have a name.")

        if not command:
            reason = str(check.get("notApplicableReason", "")).strip()
            if required or not reason:
                results.append({"name": name, "status": "failed", "command": "", "exitCode": None, "durationMs": 0, "summary": "Required command or notApplicableReason is missing."})
                overall_status = "failed"
                break
            results.append({"name": name, "status": "not_applicable", "command": "", "exitCode": None, "durationMs": 0, "summary": reason})
            continue

        started = time.monotonic()
        try:
            completed = subprocess.run(
                command,
                cwd=project_root,
                shell=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_seconds,
            )
            exit_code: int | None = completed.returncode
            status = "passed" if exit_code == 0 else "failed"
            summary = redact(f"{completed.stdout}\n{completed.stderr}".strip())
        except subprocess.TimeoutExpired as error:
            exit_code = None
            status = "failed"
            partial_output = "\n".join(str(value or "") for value in (error.stdout, error.stderr))
            summary = redact(f"Timed out after {timeout_seconds} seconds.\n{partial_output}".strip())

        duration_ms = round((time.monotonic() - started) * 1000)
        results.append({"name": name, "status": status, "command": command, "exitCode": exit_code, "durationMs": duration_ms, "summary": summary})
        if status == "failed":
            overall_status = "failed"
            if required:
                break

    report = {
        "schemaVersion": 1,
        "status": overall_status,
        "profile": arguments.profile,
        "projectPath": str(project_root),
        "gitCommit": git_commit(project_root),
        "startedAt": started_at,
        "platform": sys.platform,
        "pythonVersion": sys.version.split()[0],
        "checks": results,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Quality gate result: {overall_status}")
    print(f"Report: {report_path}")
    return 0 if overall_status == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())

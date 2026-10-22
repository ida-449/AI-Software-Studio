#!/usr/bin/env python3
"""Validate the portable structure and safety boundaries of AI Software Studio."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


STUDIO_ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = (
    "AGENTS.md",
    "AI_STUDIO_ENTRY.md",
    "PROJECT_STATUS.md",
    "PROJECTS/PROJECT_REGISTRY.md",
    "CORE_RULES/QUALITY_GATE_RULES.md",
    "CORE_RULES/ROLE_HANDOFF_RULES.md",
    "CORE_RULES/THIRD_PARTY_REFERENCE_RULES.md",
    "CORE_RULES/MULTI_USER_PRODUCT_RULES.md",
    "CORE_RULES/PUBLIC_PRODUCT_RULES.md",
    "SCRIPTS/invoke_project_quality_gate.py",
    "SCRIPTS/test_project_quality_gate.py",
    "TEMPLATES/PROJECT_QUALITY_GATE.example.json",
    "TEMPLATES/ROLE_HANDOFF_TEMPLATE.md",
)

REQUIRED_DIRECTORIES = (
    "CORE_RULES",
    "KNOWLEDGE_BASE",
    "PROJECTS",
    "ROLES",
    "SCRIPTS",
    "TEMPLATES",
)

SENSITIVE_PATH_PARTS = {".env", "auth", "data", "cookies", "chrome profile"}


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    for relative_path in REQUIRED_FILES:
        if not (STUDIO_ROOT / relative_path).is_file():
            errors.append(f"Missing required file: {relative_path}")

    for relative_path in REQUIRED_DIRECTORIES:
        if not (STUDIO_ROOT / relative_path).is_dir():
            errors.append(f"Missing required directory: {relative_path}")

    projects_path = STUDIO_ROOT / "PROJECTS"
    if projects_path.is_dir():
        for child in projects_path.iterdir():
            if child.is_dir():
                errors.append(f"Business directory found under PROJECTS: {child.name}")
            elif child.name != "PROJECT_REGISTRY.md":
                errors.append(f"Unexpected file found under PROJECTS: {child.name}")

    project_names: list[str] = []
    registry_path = projects_path / "PROJECT_REGISTRY.md"
    if registry_path.is_file():
        registry_text = registry_path.read_text(encoding="utf-8-sig")
        headings = list(re.finditer(r"^##\s+(.+)$", registry_text, flags=re.MULTILINE))
        project_names = [match.group(1).strip() for match in headings]
        if not headings:
            warnings.append("No business project is registered.")
        for index, heading in enumerate(headings):
            end = headings[index + 1].start() if index + 1 < len(headings) else len(registry_text)
            section = registry_text[heading.start() : end]
            if "当前设备路径" not in section:
                errors.append(f"Project is missing its current device path: {heading.group(1).strip()}")

    try:
        result = subprocess.run(
            ["git", "-C", str(STUDIO_ROOT), "ls-files"],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        for tracked_file in result.stdout.splitlines():
            parts = {part.casefold() for part in Path(tracked_file).parts}
            if parts & SENSITIVE_PATH_PARTS:
                errors.append(f"Prohibited sensitive path is tracked: {tracked_file}")
    except (OSError, subprocess.CalledProcessError):
        warnings.append("Unable to read Git tracked files; sensitive path scan was skipped.")

    print("AI Software Studio self-check")
    print(f"Root: {STUDIO_ROOT}")
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Result: FAILED ({len(errors)} blocking issue(s))")
        return 1

    print("Result: PASSED")
    print(f"Registered projects: {len(project_names)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

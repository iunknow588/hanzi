#!/usr/bin/env python3
"""Utility script that verifies the local cozepy SDK installation.

The script prints the detected version, module location, and attempts to
instantiate the Coze client when COZE_API_TOKEN is available.
"""
from __future__ import annotations

import os
import platform
import sys
from pathlib import Path


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def main() -> int:
    section("Python Environment")
    print(f"Python executable : {sys.executable}")
    print(f"Python version    : {platform.python_version()}")

    section("Import cozepy")
    try:
        import cozepy  # type: ignore
    except ImportError as exc:  # pragma: no cover - runtime guard
        print("Failed to import cozepy:", exc)
        return 1

    module_path = Path(cozepy.__file__).resolve()
    version = getattr(cozepy, "VERSION", getattr(cozepy, "__version__", "unknown"))
    print(f"cozepy module path: {module_path}")
    print(f"Detected VERSION  : {version}")

    section("Class Imports")
    try:
        from cozepy import Coze, TokenAuth  # type: ignore
    except ImportError as exc:  # pragma: no cover
        print("Unable to import Coze/TokenAuth:", exc)
        return 1
    else:
        print(f"Coze class        : {Coze}")
        print(f"TokenAuth class   : {TokenAuth}")

    section("Client Initialization")
    token = os.getenv("COZE_API_TOKEN")
    base_url = os.getenv("COZE_API_BASE", "https://api.coze.cn")
    print(f"Base URL          : {base_url}")

    if not token:
        print(
            "COZE_API_TOKEN is not set; skipping client instantiation.\n"
            "Export COZE_API_TOKEN (and optional COZE_API_BASE) to perform a live check."
        )
        return 0

    try:
        client = Coze(auth=TokenAuth(token), base_url=base_url)
    except Exception as exc:  # pragma: no cover
        print("Failed to instantiate Coze client:", exc)
        return 1

    print("Successfully created Coze client (no network call performed).")
    print(f"Client repr        : {client}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

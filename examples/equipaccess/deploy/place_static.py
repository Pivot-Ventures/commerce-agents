# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""Copy Next `.next/static` next to each standalone `server.js`."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path


def place(name: str) -> None:
    root = Path("/app/web") / name
    matches = sorted(root.rglob("server.js"))
    if not matches:
        raise SystemExit(f"no server.js under {root}")
    dest = matches[0].parent / ".next" / "static"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(Path("/tmp/static") / name, dest, dirs_exist_ok=True)
    print(f"placed {name} static at {dest}")


def main() -> int:
    for name in ("storefront", "merchant", "admin"):
        place(name)
    return 0


if __name__ == "__main__":
    sys.exit(main())

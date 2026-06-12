#!/usr/bin/env python3
"""Helper: imprime progreso de lotes para aplicar manualmente o vía agente MCP."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "supabase" / "seed" / "generated_import"


def main() -> int:
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 47

    for i in range(start, end + 1):
        path = SEED / f"batch_{i:03d}.sql"
        if not path.exists():
            print(f"MISSING {path}")
            continue
        print(f"BATCH {i:03d} {path.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

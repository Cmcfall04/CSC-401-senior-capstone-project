#!/usr/bin/env python3
"""
Verify Apify usage guard and (optionally) one price-compare query.
Does NOT print or log APIFY_TOKEN. Run from project root with .env set.

Usage:
  cd /path/to/CSC-401-senior-capstone-project
  python scripts/verify_apify.py              # usage guard only
  python scripts/verify_apify.py --one-query  # guard + one cached_search call
"""

import os
import sys
from pathlib import Path

# Project root: parent of scripts/
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "api"))

# Load .env from project root (do not load from api/ to match main app)
def load_dotenv():
    env_path = ROOT / ".env"
    if env_path.exists():
        try:
            from dotenv import load_dotenv as _load
            _load(env_path)
        except ImportError:
            pass

load_dotenv()

def main():
    from src.services.apify_client import can_use_apify, get_monthly_usage_cached, cached_search

    token = os.getenv("APIFY_TOKEN", "").strip()
    print("APIFY_TOKEN set:", "yes" if token else "no")
    if not token:
        print("Set APIFY_TOKEN in .env to test usage guard and search.")
        return 0

    # 1) Usage guard
    allowed, reason = can_use_apify()
    print("can_use_apify():", allowed, "| reason:", reason)

    # Optional: show usage (no token)
    usage = get_monthly_usage_cached()
    if usage:
        data = usage.get("data") or usage
        cu = data.get("currentMonthUsageUsd") or data.get("totalUsageCreditsUsdAfterVolumeDiscount")
        ru = data.get("remainingCreditsUsd")
        print("Usage (current):", cu, "| remaining:", ru)
    else:
        print("Usage: could not fetch")

    # 2) Optional one query (does not print token; uses cached_search which uses env token)
    if "--one-query" in sys.argv:
        if not allowed:
            print("Skipping query: Apify disabled by usage guard.")
            return 0
        print("Calling cached_search('milk', '33602')...")
        results, used_cache, err = cached_search("milk", "33602")
        print("used_cache:", used_cache, "| error:", err or "none", "| results count:", len(results))
        if results:
            r0 = results[0]
            print("First result keys:", list(r0.keys()) if isinstance(r0, dict) else type(r0))
    return 0

if __name__ == "__main__":
    sys.exit(main())

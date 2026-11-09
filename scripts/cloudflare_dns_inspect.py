#!/usr/bin/env python3
"""Read the shop zone's DNS without logging the API token or TXT contents."""

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://api.cloudflare.com/client/v4"
DOMAIN = "mylittleproject.co.uk"
CLERK_NAMES = {f"{name}.{DOMAIN}" for name in
               ("clerk", "accounts", "clkmail", "clk._domainkey", "clk2._domainkey")}


def get(token, path):
    request = Request(BASE + path, headers={"Authorization": "Bearer " + token,
                                           "Accept": "application/json"})
    try:
        with urlopen(request, timeout=30) as response:
            data = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f"Cloudflare GET {path.split('?')[0]} returned HTTP {error.code}") from None
    except (URLError, TimeoutError, ValueError):
        raise RuntimeError("Cloudflare DNS inspection could not reach the API") from None
    if not data.get("success"):
        raise RuntimeError(f"Cloudflare rejected GET {path.split('?')[0]}")
    return data


def inspect(token):
    if not token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN is missing")
    zones = get(token, "/zones?" + urlencode({"name": DOMAIN, "per_page": 50}))["result"]
    matches = [zone for zone in zones if zone.get("name") == DOMAIN]
    if len(matches) != 1:
        raise RuntimeError("Expected exactly one matching shop DNS zone")
    zone_id = matches[0]["id"]
    print("Matched the shop DNS zone.", flush=True)
    rows = []
    for page in range(1, 21):
        data = get(token, f"/zones/{zone_id}/dns_records?" + urlencode({"per_page": 100, "page": page}))
        batch = data["result"]
        if not isinstance(batch, list):
            raise RuntimeError("Unexpected DNS records response")
        rows.extend(batch)
        info = data.get("result_info") or {}
        if (info.get("total_pages") is not None and page >= info["total_pages"]) or (info.get("total_pages") is None and len(batch) < 100):
            break
    else:
        raise RuntimeError("DNS zone exceeded the supported page limit")
    exact = [{"name": row["name"], "type": row["type"],
              "content": row.get("content") if row["type"] != "TXT" else "[redacted]",
              "proxied": row.get("proxied")}
             for row in rows if row.get("name") in CLERK_NAMES]
    email = [{"name": row["name"], "type": row["type"]}
             for row in rows if row.get("type") in ("MX", "TXT") and row.get("name") == DOMAIN]
    print("Existing records at Clerk's requested names:")
    print(json.dumps(exact, indent=2))
    print("Existing root email record names/types (TXT contents hidden):")
    print(json.dumps(email, indent=2))
    print("Read-only DNS inspection complete.")


if __name__ == "__main__":
    try:
        inspect(os.environ.get("CLOUDFLARE_API_TOKEN", ""))
    except RuntimeError as error:
        print("DNS inspection stopped: " + str(error), file=sys.stderr)
        raise SystemExit(1) from None

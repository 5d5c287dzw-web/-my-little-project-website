#!/usr/bin/env python3
"""Inspect or configure the production Pages/D1 portal from a manual CI run.

The token is read only from the process environment. Never print API responses
containing Pages environment variable values or the token itself.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


PROJECT = "my-little-project-website"
REPOSITORY_OWNER = "5d5c287dzw-web"
REPOSITORY_NAME = "-my-little-project-website"
DATABASE = "mlp-shop-production"
SHOP_ORIGIN = "https://mylittleproject.co.uk"
BASE = "https://api.cloudflare.com/client/v4"


class SetupError(Exception):
    pass


def discover_account_id(token: str):
    """Find the one Cloudflare account serving this exact repository-backed site."""
    if not token:
        raise SetupError("CLOUDFLARE_API_TOKEN GitHub Actions secret is missing")
    request = Request(BASE + "/accounts?per_page=50", headers={
        "Authorization": "Bearer " + token, "Accept": "application/json",
    })
    try:
        with urlopen(request, timeout=30) as response:
            data = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError):
        raise SetupError("Could not discover the Cloudflare account; enter account_id in a manual inspect run") from None
    if not data.get("success") or (data.get("result_info") or {}).get("total_count", 0) > 50:
        raise SetupError("Could not uniquely discover the account; enter account_id in a manual inspect run")
    matches = []
    for account in data.get("result") or []:
        account_id = account.get("id", "")
        if not re.fullmatch(r"[a-fA-F0-9]{32}", account_id):
            continue
        try:
            candidate = Cloudflare(token, account_id).project()
            validate_project(candidate)
            matches.append(account_id)
        except SetupError:
            continue
    if len(matches) != 1:
        raise SetupError("Could not uniquely match the Pages project; enter account_id in a manual inspect run")
    return matches[0]


class Cloudflare:
    def __init__(self, token: str, account_id: str):
        if not token:
            raise SetupError("CLOUDFLARE_API_TOKEN GitHub Actions secret is missing")
        if not re.fullmatch(r"[a-fA-F0-9]{32}", account_id):
            raise SetupError("Cloudflare account ID must be 32 hexadecimal characters")
        self.token = token
        self.path = f"/accounts/{account_id}"

    def call(self, method: str, path: str, body: dict | None = None):
        if not path.startswith(self.path + "/"):
            raise SetupError("Cloudflare API path is outside the selected account")
        endpoint = path.split("?", 1)[0].removeprefix(self.path)
        payload = json.dumps(body).encode() if body is not None else None
        request = Request(
            BASE + path,
            data=payload,
            method=method,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                data = json.load(response)
        except HTTPError as error:
            try:
                details = json.load(error)
                messages = "; ".join(f"{item.get('code', '?')}: {item.get('message', 'API error')}"
                                     for item in details.get("errors", []))
            except (ValueError, AttributeError):
                messages = "API request failed"
            raise SetupError(f"Cloudflare API {method} {endpoint} HTTP {error.code}: {messages[:400]}") from None
        except (URLError, TimeoutError) as error:
            raise SetupError(f"Cloudflare API connection failed: {type(error).__name__}") from None
        if not data.get("success"):
            messages = "; ".join(str(item.get("message", "API error")) for item in data.get("errors", []))
            raise SetupError(f"Cloudflare API rejected {method} {path.split(self.path)[-1]}: {messages[:400]}")
        return data

    def project(self):
        return self.call("GET", self.path + "/pages/projects/" + PROJECT)["result"]

    def databases(self):
        rows = []
        for page in range(1, 21):
            data = self.call("GET", self.path + f"/d1/database?per_page=100&page={page}")
            result = data["result"]
            if not isinstance(result, list):
                raise SetupError("Unexpected D1 database list response")
            rows.extend(result)
            info = data.get("result_info") or {}
            total_pages = info.get("total_pages")
            if (total_pages is not None and page >= total_pages) or (total_pages is None and len(result) < 100):
                return rows
        raise SetupError("D1 database list exceeded the supported page limit")

    def query(self, database_id: str, sql: str):
        response = self.call("POST", self.path + f"/d1/database/{database_id}/query", {"sql": sql})["result"]
        if not isinstance(response, list) or not response or not all(row.get("success") for row in response):
            raise SetupError("A D1 statement failed; review the migration before retrying")
        return response


def validate_project(project: dict):
    if project.get("name") != PROJECT:
        raise SetupError("The Pages project name does not match this site")
    source = project.get("source") or {}
    config = source.get("config") or {}
    branch = config.get("production_branch") or project.get("production_branch")
    if (source.get("type") != "github" or config.get("owner") != REPOSITORY_OWNER
            or config.get("repo_name") != REPOSITORY_NAME or branch != "main"):
        raise SetupError("Pages project source is not the expected GitHub main branch")


def inspect(project: dict, databases: list[dict]):
    validate_project(project)
    matches = [database for database in databases if database.get("name") == DATABASE]
    if len(matches) > 1:
        raise SetupError("Multiple D1 databases have the reserved production name")
    by_id = {database.get("uuid"): database.get("name") for database in databases}
    config = project.get("deployment_configs") or {}
    production = config.get("production") or {}
    preview = config.get("preview") or {}
    production_id = ((production.get("d1_databases") or {}).get("DB") or {}).get("id")
    preview_id = ((preview.get("d1_databases") or {}).get("DB") or {}).get("id")
    target_id = matches[0].get("uuid") if matches else None
    if production_id and production_id != target_id and by_id.get(production_id) != "mlp-workshop-dev":
        raise SetupError("Production DB is an unexpected database; refusing to replace it")
    if target_id and target_id == preview_id:
        raise SetupError("Reserved production D1 database is bound to Preview; refusing to share it")
    return {
        "production_db": {"id": production_id, "name": by_id.get(production_id)},
        "preview_db": {"id": preview_id, "name": by_id.get(preview_id)},
        "target_db": {"id": target_id, "name": DATABASE},
        "production_fail_open": production.get("fail_open"),
        "production_variable_names": sorted((production.get("env_vars") or {}).keys()),
    }


def clerk_variables(key: str, issuer: str):
    if not key and not issuer:
        return {}
    parsed = urlparse(issuer)
    if (not re.fullmatch(r"pk_live_[A-Za-z0-9_-]+", key) or parsed.scheme != "https" or not parsed.hostname
            or parsed.username or parsed.password or parsed.port or parsed.params
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment
            or parsed.hostname.endswith(".accounts.dev")):
        raise SetupError("Provide both a production pk_live_ Clerk key and its exact HTTPS issuer origin")
    origin = parsed.scheme + "://" + parsed.netloc
    return {
        "CLERK_PUBLISHABLE_KEY": {"type": "plain_text", "value": key},
        "CLERK_ISSUER": {"type": "plain_text", "value": origin},
        "CLERK_JWKS_URL": {"type": "plain_text", "value": origin + "/.well-known/jwks.json"},
        "CLERK_ALLOWED_ORIGINS": {"type": "plain_text", "value": SHOP_ORIGIN},
    }


def apply(client: Cloudflare, before: dict, plan: dict, variables: dict):
    target_id = plan["target_db"]["id"]
    if not target_id:
        created = client.call("POST", client.path + "/d1/database", {"name": DATABASE, "jurisdiction": "eu"})["result"]
        target_id = created.get("uuid")
        if not target_id:
            raise SetupError("D1 create response did not include a database ID")
        print("Created a dedicated EU-jurisdiction production D1 database.")
    sql = (Path(__file__).resolve().parents[1] / "database/003_portal_workspace.sql").read_text()
    client.query(target_id, sql)
    verification = client.query(target_id, "SELECT COUNT(*) AS count FROM shop_products")
    if verification[0].get("results", [{}])[0].get("count", 0) < 3:
        raise SetupError("The starter catalogue did not appear in production D1")
    print("Verified the portal schema and hidden starter catalogue in D1.")

    production_patch = {"d1_databases": {"DB": {"id": target_id}}, "fail_open": False}
    if variables:
        production_patch["env_vars"] = variables
    client.call("PATCH", client.path + "/pages/projects/" + PROJECT,
                {"deployment_configs": {"production": production_patch}})
    after = client.project()
    actual = inspect(after, client.databases())
    if actual["production_db"]["id"] != target_id or actual["production_fail_open"] is not False:
        raise SetupError("Production binding or fail-closed setting did not persist")
    if actual["preview_db"] != plan["preview_db"]:
        raise SetupError("Preview DB changed unexpectedly; inspect Pages settings")
    old_vars = (before.get("deployment_configs", {}).get("production") or {}).get("env_vars") or {}
    new_vars = (after.get("deployment_configs", {}).get("production") or {}).get("env_vars") or {}
    if not set(old_vars).issubset(new_vars) or not set(variables).issubset(new_vars):
        raise SetupError("Production variable names changed unexpectedly; inspect Pages settings")
    for key in old_vars:
        if (old_vars[key] or {}).get("type") != (new_vars[key] or {}).get("type"):
            raise SetupError("An existing production variable type changed unexpectedly")
    print("Verified Production DB binding and fail-closed setting; Preview DB stayed separate.")

    deployment = after.get("canonical_deployment") or {}
    deployment_id = deployment.get("id")
    if not deployment_id:
        raise SetupError("Pages project has no production deployment to retry")
    retry = client.call("POST", client.path + f"/pages/projects/{PROJECT}/deployments/{deployment_id}/retry")["result"]
    retry_id = retry.get("id")
    if not retry_id:
        raise SetupError("Pages did not return a retried deployment ID")
    for _ in range(24):
        state = client.call("GET", client.path + f"/pages/projects/{PROJECT}/deployments/{retry_id}")["result"]
        stage = state.get("latest_stage") or {}
        if stage.get("status") == "failure":
            raise SetupError("The Pages redeployment failed")
        if stage.get("name") == "deploy" and stage.get("status") == "success":
            break
        time.sleep(5)
    else:
        raise SetupError("Pages redeployment has not completed within two minutes")
    for _ in range(12):
        try:
            with urlopen(SHOP_ORIGIN + "/api/shop", timeout=10) as response:
                live_catalogue = json.load(response)
            if live_catalogue.get("available") is True:
                break
        except (HTTPError, URLError, TimeoutError, ValueError):
            pass
        time.sleep(5)
    else:
        raise SetupError("Live catalogue API did not see the production D1 schema after redeployment")
    print("Live catalogue API confirmed the production D1 connection.")
    if variables:
        try:
            with urlopen(SHOP_ORIGIN + "/api/auth-config", timeout=10) as response:
                auth = json.load(response)
        except (HTTPError, URLError, TimeoutError, ValueError):
            raise SetupError("Live sign-in configuration did not become available") from None
        if auth.get("publishableKey") != variables["CLERK_PUBLISHABLE_KEY"]["value"]:
            raise SetupError("Live sign-in configuration does not match the supplied production Clerk key")
        print("Live sign-in configuration returned the production Clerk publishable key.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("inspect", "apply"), required=True)
    args = parser.parse_args()
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    if not account_id:
        account_id = discover_account_id(token)
        print("Matched the Cloudflare account to the expected GitHub-backed Pages project.", flush=True)
    client = Cloudflare(token, account_id)
    variables = clerk_variables(os.environ.get("CLERK_PUBLISHABLE_KEY", ""),
                                os.environ.get("CLERK_ISSUER", ""))
    project = client.project()
    plan = inspect(project, client.databases())
    print("Production plan (no secrets):")
    print(json.dumps(plan, indent=2))
    if args.mode == "inspect":
        print("Inspection only. No Cloudflare changes were made.")
        return
    apply(client, project, plan, variables)


if __name__ == "__main__":
    try:
        main()
    except SetupError as error:
        print("Setup stopped: " + str(error), file=sys.stderr)
        raise SystemExit(1) from None

import importlib.util
import io
import copy
import json
import unittest
from pathlib import Path
from unittest.mock import patch


path = Path(__file__).resolve().parents[1] / "scripts/cloudflare_portal_setup.py"
spec = importlib.util.spec_from_file_location("cloudflare_portal_setup", path)
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


def project(production_db="dev-id", preview_db="dev-id"):
    return {
        "name": setup.PROJECT,
        "source": {"type": "github", "config": {
            "owner": setup.REPOSITORY_OWNER,
            "repo_name": setup.REPOSITORY_NAME,
            "production_branch": "main",
        }},
        "deployment_configs": {
            "production": {"d1_databases": {"DB": {"id": production_db}},
                           "env_vars": {"EXISTING": {"type": "plain_text", "value": "kept"}},
                           "fail_open": True},
            "preview": {"d1_databases": {"DB": {"id": preview_db}}},
        },
        "canonical_deployment": {"id": "old-deployment"},
    }


class FakeCloudflare:
    path = "/accounts/" + "a" * 32

    def __init__(self):
        self.state = project()
        self.rows = [{"name": "mlp-workshop-dev", "uuid": "dev-id"}]
        self.calls = []

    def project(self):
        return self.state

    def databases(self):
        return self.rows

    def query(self, database_id, sql):
        self.calls.append(("QUERY", database_id, sql))
        if "COUNT" in sql:
            return [{"success": True, "results": [{"count": 3}]}]
        return [{"success": True}]

    def call(self, method, path, body=None):
        self.calls.append((method, path, body))
        if method == "POST" and path.endswith("/d1/database"):
            self.rows.append({"name": setup.DATABASE, "uuid": "production-id"})
            return {"result": {"uuid": "production-id"}}
        if method == "PATCH":
            production = self.state["deployment_configs"]["production"]
            patch = body["deployment_configs"]["production"]
            production["d1_databases"].update(patch["d1_databases"])
            production["fail_open"] = patch["fail_open"]
            production["env_vars"].update(patch.get("env_vars", {}))
            return {"result": self.state}
        if method == "POST" and path.endswith("/retry"):
            return {"result": {"id": "new-deployment"}}
        if method == "GET" and path.endswith("/new-deployment"):
            return {"result": {"latest_stage": {"name": "deploy", "status": "success"}}}
        raise AssertionError((method, path))


class CloudflareSetupTests(unittest.TestCase):
    def test_discovers_only_the_account_with_the_expected_pages_source(self):
        accounts = {"success": True, "result": [{"id": "a" * 32}, {"id": "b" * 32}],
                    "result_info": {"total_count": 2}}
        def source_for_account(client):
            result = project()
            if client.path.endswith("b" * 32):
                result["source"]["config"]["repo_name"] = "another-site"
            return result
        with patch.object(setup, "urlopen", return_value=io.BytesIO(json.dumps(accounts).encode())), \
             patch.object(setup.Cloudflare, "project", source_for_account):
            self.assertEqual(setup.discover_account_id("test-token"), "a" * 32)

    def test_refuses_unexpected_production_database_or_source(self):
        databases = [{"name": "other-production", "uuid": "other-id"}]
        with self.assertRaisesRegex(setup.SetupError, "unexpected database"):
            setup.inspect(project("other-id", "preview-id"), databases)
        wrong_source = project()
        wrong_source["source"]["config"]["repo_name"] = "a-different-repo"
        with self.assertRaisesRegex(setup.SetupError, "expected GitHub"):
            setup.inspect(wrong_source, databases)
        with self.assertRaisesRegex(setup.SetupError, "bound to Preview"):
            setup.inspect(project("dev-id", "production-id"), [
                {"name": "mlp-workshop-dev", "uuid": "dev-id"},
                {"name": setup.DATABASE, "uuid": "production-id"},
            ])

    def test_clerk_config_accepts_only_production_pair(self):
        with self.assertRaises(setup.SetupError):
            setup.clerk_variables("pk_test_development", "https://example.accounts.dev")
        with self.assertRaises(setup.SetupError):
            setup.clerk_variables("pk_live_example", "")
        variables = setup.clerk_variables("pk_live_example", "https://clerk.example.com")
        self.assertEqual(variables["CLERK_ALLOWED_ORIGINS"]["value"], setup.SHOP_ORIGIN)
        self.assertEqual(variables["CLERK_JWKS_URL"]["value"], "https://clerk.example.com/.well-known/jwks.json")

    def test_apply_creates_separate_database_and_patches_only_production(self):
        client = FakeCloudflare()
        before = copy.deepcopy(client.project())
        plan = setup.inspect(before, client.databases())
        original_preview = dict(before["deployment_configs"]["preview"])
        with patch.object(setup, "urlopen", return_value=io.BytesIO(b'{"available":true}')):
            setup.apply(client, before, plan, {})
        payload = next(body for method, _, body in client.calls if method == "PATCH")
        self.assertEqual(payload, {"deployment_configs": {"production": {
            "d1_databases": {"DB": {"id": "production-id"}}, "fail_open": False}}})
        self.assertEqual(client.project()["deployment_configs"]["preview"], original_preview)
        self.assertEqual(client.project()["deployment_configs"]["production"]["env_vars"]["EXISTING"]["value"], "kept")
        self.assertTrue(any(method == "QUERY" and "CREATE TABLE" in sql
                            for method, _, sql in client.calls if method == "QUERY"))


if __name__ == "__main__":
    unittest.main()

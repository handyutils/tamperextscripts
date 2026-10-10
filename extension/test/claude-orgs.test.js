import { test } from "node:test";
import assert from "node:assert/strict";
import { orderOrganizations } from "../src/providers/claude-orgs.js";

const orgs = [{ uuid: "a" }, { uuid: "b" }, { uuid: "c" }];

test("tries the cookie organization first when it belongs to the account", () => {
  assert.deepEqual(orderOrganizations(orgs, "b"), ["b", "a", "c"]);
});

test("ignores a stale cookie organization that is not in the account's list", () => {
  assert.deepEqual(orderOrganizations(orgs, "old-account-org"), ["a", "b", "c"]);
});

test("works without a cookie and with an empty list", () => {
  assert.deepEqual(orderOrganizations(orgs, null), ["a", "b", "c"]);
  assert.deepEqual(orderOrganizations([], "b"), []);
});

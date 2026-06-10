import { describe, it, expect } from "vitest";
import { buildOverrideRule } from "../src/background/rules-engine";
import type { Merchant } from "../src/types";

const amazon: Merchant = {
  id: "amazon-us",
  name: "Amazon US",
  matches: ["*://*.amazon.com/*"],
  requestDomains: ["amazon.com"],
  strategy: "queryParam",
  param: "tag",
  userKeyField: "amazonTagUs",
  detectExistingParams: ["tag"],
  overrideExistingOnApply: true,
};

describe("buildOverrideRule", () => {
  const rule = buildOverrideRule({ ruleId: 42, tabId: 42, merchant: amazon, value: "mine-20" });

  it("redirects the main frame, replacing the affiliate param with the user's value", () => {
    expect(rule.action.type).toBe("redirect");
    expect(rule.action.redirect.transform.queryTransform.addOrReplaceParams).toEqual([
      { key: "tag", value: "mine-20" },
    ]);
    expect(rule.condition.resourceTypes).toEqual(["main_frame"]);
  });

  it("scopes the rule to the merchant's domain and the one tab", () => {
    expect(rule.condition.requestDomains).toEqual(["amazon.com"]);
    expect(rule.condition.tabIds).toEqual([42]);
    expect(rule.id).toBe(42);
  });

  it("uses each merchant's own param key", () => {
    const other = buildOverrideRule({
      ruleId: 1,
      tabId: 1,
      merchant: { ...amazon, param: "aff" },
      value: "x",
    });
    expect(other.action.redirect.transform.queryTransform.addOrReplaceParams[0]?.key).toBe("aff");
  });
});

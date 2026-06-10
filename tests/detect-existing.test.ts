import { describe, it, expect } from "vitest";
import { detectExistingAffiliate } from "../src/shared/detect-existing";
import type { Merchant } from "../src/types";

const amazon: Merchant = {
  id: "amazon-us",
  name: "Amazon US",
  matches: ["*://*.amazon.com/*"],
  requestDomains: ["amazon.com"],
  strategy: "queryParam",
  param: "tag",
  userKeyField: "amazonTagUs",
  detectExistingParams: ["tag", "ascsubtag"],
  overrideExistingOnApply: true,
};

describe("detectExistingAffiliate", () => {
  it("flags a foreign code as present and not yours", () => {
    const r = detectExistingAffiliate("https://amazon.com/dp/x?tag=creator-20", amazon, "mine-20");
    expect(r).toMatchObject({ present: true, param: "tag", value: "creator-20", isYours: false });
  });

  it("recognises your own code", () => {
    const r = detectExistingAffiliate("https://amazon.com/dp/x?tag=mine-20", amazon, "mine-20");
    expect(r).toMatchObject({ present: true, value: "mine-20", isYours: true });
  });

  it("reports no code when the param is absent", () => {
    const r = detectExistingAffiliate("https://amazon.com/dp/x", amazon, "mine-20");
    expect(r).toEqual({ present: false, isYours: false });
  });

  it("treats an empty param value as absent", () => {
    const r = detectExistingAffiliate("https://amazon.com/dp/x?tag=", amazon, "mine-20");
    expect(r.present).toBe(false);
  });

  it("handles a non-yours code when the user has no value configured", () => {
    const r = detectExistingAffiliate("https://amazon.com/dp/x?tag=creator-20", amazon, undefined);
    expect(r).toMatchObject({ present: true, isYours: false });
  });

  it("does not throw on a malformed URL", () => {
    expect(detectExistingAffiliate("not a url", amazon).present).toBe(false);
  });
});

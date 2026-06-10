import { describe, it, expect } from "vitest";
import {
  MERCHANTS,
  matchPatternToRegex,
  findMerchantForUrl,
  uniqueUserKeyFields,
} from "../src/shared/merchants";

describe("matchPatternToRegex", () => {
  it("matches host + subdomains for *://*.amazon.com/*", () => {
    const re = matchPatternToRegex("*://*.amazon.com/*");
    expect(re.test("https://www.amazon.com/dp/B00TEST")).toBe(true);
    expect(re.test("https://amazon.com/")).toBe(true);
    expect(re.test("http://smile.amazon.com/gp/cart")).toBe(true);
  });

  it("does not match other hosts", () => {
    const re = matchPatternToRegex("*://*.amazon.com/*");
    expect(re.test("https://notamazon.com/")).toBe(false);
    expect(re.test("https://amazon.com.evil.test/")).toBe(false);
    expect(re.test("https://www.amazon.co.uk/dp/x")).toBe(false);
  });
});

describe("findMerchantForUrl", () => {
  it("resolves each Amazon locale to its merchant", () => {
    expect(findMerchantForUrl("https://www.amazon.com/dp/x")?.id).toBe("amazon-us");
    expect(findMerchantForUrl("https://www.amazon.co.uk/dp/x")?.id).toBe("amazon-uk");
    expect(findMerchantForUrl("https://www.amazon.de/dp/x")?.id).toBe("amazon-de");
  });

  it("returns undefined for unsupported stores", () => {
    expect(findMerchantForUrl("https://www.walmart.com/ip/123")).toBeUndefined();
  });
});

describe("uniqueUserKeyFields", () => {
  it("yields one field per distinct userKeyField", () => {
    const fields = uniqueUserKeyFields();
    expect(fields.map((f) => f.field).sort()).toEqual(
      ["amazonTagDe", "amazonTagUk", "amazonTagUs"].sort(),
    );
    expect(fields.length).toBe(MERCHANTS.length);
  });
});

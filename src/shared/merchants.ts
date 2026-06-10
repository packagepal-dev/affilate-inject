import type { Merchant } from "../types";
import amazonUs from "./merchants/amazon-us.json";
import amazonUk from "./merchants/amazon-uk.json";
import amazonDe from "./merchants/amazon-de.json";

/** Registry of supported stores. Add a JSON file and import it here to extend. */
export const MERCHANTS: Merchant[] = [amazonUs, amazonUk, amazonDe] as Merchant[];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convert a Chrome match pattern ("*://*.amazon.com/*") to an anchored RegExp. */
export function matchPatternToRegex(pattern: string): RegExp {
  const m = /^(\*|https?|file|ftp):\/\/([^/]*)(\/.*)$/.exec(pattern);
  if (!m) throw new Error(`unsupported match pattern: ${pattern}`);
  const scheme = m[1]!;
  const host = m[2]!;
  const path = m[3]!;

  let re = "^";
  re += scheme === "*" ? "https?" : escapeRegex(scheme);
  re += "://";
  if (host === "*") {
    re += "[^/]+";
  } else if (host.startsWith("*.")) {
    re += "(?:[^/]+\\.)?" + escapeRegex(host.slice(2));
  } else {
    re += escapeRegex(host);
  }
  re += path.split("*").map(escapeRegex).join(".*");
  re += "$";
  return new RegExp(re);
}

/** First merchant whose match patterns cover the given URL, if any. */
export function findMerchantForUrl(
  url: string,
  merchants: Merchant[] = MERCHANTS,
): Merchant | undefined {
  return merchants.find((merchant) =>
    merchant.matches.some((pattern) => matchPatternToRegex(pattern).test(url)),
  );
}

/** Distinct affiliate-id fields across merchants, for rendering the options form. */
export function uniqueUserKeyFields(
  merchants: Merchant[] = MERCHANTS,
): { field: string; label: string; param: string }[] {
  const byField = new Map<string, { names: string[]; param: string }>();
  for (const m of merchants) {
    const entry = byField.get(m.userKeyField) ?? { names: [], param: m.param };
    entry.names.push(m.name);
    byField.set(m.userKeyField, entry);
  }
  return [...byField.entries()].map(([field, { names, param }]) => ({
    field,
    param,
    label: `${names.join(", ")} — ${param}`,
  }));
}

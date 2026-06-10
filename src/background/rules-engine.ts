import type { Merchant } from "../types";

/**
 * Structural shape of the declarativeNetRequest rule we build. Kept free of any
 * `chrome.*` runtime references so it can be unit-tested without the extension
 * APIs; the service worker casts it to chrome.declarativeNetRequest.Rule at the
 * boundary.
 */
export interface OverrideRule {
  id: number;
  priority: number;
  action: {
    type: "redirect";
    redirect: {
      transform: {
        queryTransform: {
          addOrReplaceParams: { key: string; value: string }[];
        };
      };
    };
  };
  condition: {
    requestDomains: string[];
    resourceTypes: string[];
    tabIds: number[];
  };
}

/**
 * Build a session-scoped rule that rewrites the merchant's affiliate param to
 * the user's value on the top-level navigation of one tab. `addOrReplaceParams`
 * replaces any existing value, which is how Apply overrides a foreign code.
 * Because the redirect target only changes the param, a request that already
 * carries the user's value is a no-op redirect (Chrome skips it), so there is
 * no redirect loop.
 */
export function buildOverrideRule(opts: {
  ruleId: number;
  tabId: number;
  merchant: Merchant;
  value: string;
}): OverrideRule {
  const { ruleId, tabId, merchant, value } = opts;
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        transform: {
          queryTransform: {
            addOrReplaceParams: [{ key: merchant.param, value }],
          },
        },
      },
    },
    condition: {
      requestDomains: merchant.requestDomains,
      resourceTypes: ["main_frame"],
      tabIds: [tabId],
    },
  };
}

import { MERCHANTS } from "../shared/merchants";
import { getUserKeys } from "../shared/storage";
import { buildOverrideRule } from "./rules-engine";
import type { ApplyResult, RuntimeMessage, TabState } from "../types";

// Open the options page on first install so the user sees the disclosure and
// can enter their own affiliate ids before anything is applied.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) } satisfies ApplyResult));
    return true; // keep the channel open for the async response
  },
);

async function handleMessage(message: RuntimeMessage): Promise<unknown> {
  switch (message.type) {
    case "APPLY_CODE":
      return applyCode(message.tabId, message.merchantId);
    case "CLEAR_CODE":
      return clearCode(message.tabId);
    case "GET_TAB_STATE":
      return getTabState(message.tabId);
  }
}

async function applyCode(tabId: number, merchantId: string): Promise<ApplyResult> {
  const merchant = MERCHANTS.find((m) => m.id === merchantId);
  if (!merchant) return { ok: false, error: "Unknown store." };

  const value = (await getUserKeys())[merchant.userKeyField];
  if (!value) return { ok: false, error: `No affiliate id set for ${merchant.name}.` };

  // One override rule per tab; reuse the tab id as the rule id so applying
  // again just replaces it and closing the tab can clean it up.
  const rule = buildOverrideRule({ ruleId: tabId, tabId, merchant, value });
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
    addRules: [rule as unknown as chrome.declarativeNetRequest.Rule],
  });
  await chrome.tabs.reload(tabId);
  return { ok: true };
}

async function clearCode(tabId: number): Promise<ApplyResult> {
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
  await chrome.tabs.reload(tabId);
  return { ok: true };
}

async function getTabState(tabId: number): Promise<TabState> {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  return { applied: rules.some((rule) => rule.id === tabId) };
}

// Remove a tab's override rule when the tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.declarativeNetRequest
    .updateSessionRules({ removeRuleIds: [tabId] })
    .catch(() => {});
});

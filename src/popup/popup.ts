import { findMerchantForUrl } from "../shared/merchants";
import { detectExistingAffiliate } from "../shared/detect-existing";
import { getUserKeys } from "../shared/storage";
import type { RuntimeMessage, TabState } from "../types";

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node;
}

function send<T>(message: RuntimeMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

async function render(): Promise<void> {
  const statusEl = el("status");
  const detailEl = el("detail");
  const applyBtn = el("apply") as HTMLButtonElement;
  const clearBtn = el("clear") as HTMLButtonElement;

  el("options").addEventListener("click", () => chrome.runtime.openOptionsPage());

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;
  const url = tab?.url;
  if (tabId == null || !url) {
    statusEl.textContent = "No active tab.";
    return;
  }

  const merchant = findMerchantForUrl(url);
  if (!merchant) {
    statusEl.textContent = "Not a supported store.";
    detailEl.textContent = "Open a supported store (e.g. amazon.com) to apply your code.";
    return;
  }

  const myValue = (await getUserKeys())[merchant.userKeyField];
  const detection = detectExistingAffiliate(url, merchant, myValue);
  const state = await send<TabState>({ type: "GET_TAB_STATE", tabId });

  statusEl.textContent = `Detected: ${merchant.name}`;
  clearBtn.disabled = !state.applied;

  if (!myValue) {
    detailEl.textContent = `No ${merchant.param} set for ${merchant.name}. Add it in settings first.`;
    return;
  }

  applyBtn.disabled = false;
  if (state.applied || detection.isYours) {
    detailEl.textContent = `Your ${merchant.param} "${myValue}" is active on this tab.`;
  } else if (detection.present) {
    detailEl.innerHTML =
      `Your ${merchant.param}: <b>${myValue}</b>.<br>` +
      `<span class="warn">An existing code "${detection.value}" is present — ` +
      `Apply will override it with yours.</span>`;
  } else {
    detailEl.textContent = `Your ${merchant.param}: ${myValue}. No code applied yet.`;
  }

  applyBtn.addEventListener("click", async () => {
    applyBtn.disabled = true;
    await send<unknown>({ type: "APPLY_CODE", tabId, merchantId: merchant.id });
    window.close();
  });
  clearBtn.addEventListener("click", async () => {
    clearBtn.disabled = true;
    await send<unknown>({ type: "CLEAR_CODE", tabId });
    window.close();
  });
}

void render();

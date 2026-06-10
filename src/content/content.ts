import { findMerchantForUrl } from "../shared/merchants";
import { detectExistingAffiliate } from "../shared/detect-existing";
import { getUserKeys } from "../shared/storage";

const BADGE_ID = "affilate-inject-badge";

function renderBadge(text: string, warn: boolean): void {
  if (document.getElementById(BADGE_ID)) return;
  const badge = document.createElement("div");
  badge.id = BADGE_ID;
  badge.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:2147483647",
    "max-width:260px",
    "padding:8px 10px",
    "border-radius:8px",
    "font:12px/1.4 system-ui,sans-serif",
    "color:#fff",
    `background:${warn ? "#b54708" : "#1f2937"}`,
    "box-shadow:0 2px 8px rgba(0,0,0,.3)",
    "cursor:default",
  ].join(";");

  const msg = document.createElement("span");
  msg.textContent = text;

  const close = document.createElement("span");
  close.textContent = "  ✕";
  close.style.cssText = "cursor:pointer;font-weight:700;margin-left:6px";
  close.addEventListener("click", () => badge.remove());

  badge.append(msg, close);
  document.documentElement.append(badge);
}

async function main(): Promise<void> {
  const merchant = findMerchantForUrl(location.href);
  if (!merchant) return;

  const myValue = (await getUserKeys())[merchant.userKeyField];
  const detection = detectExistingAffiliate(location.href, merchant, myValue);

  if (!myValue) {
    renderBadge(`affilate-inject: set your ${merchant.param} for ${merchant.name} in settings.`, false);
  } else if (detection.isYours) {
    renderBadge(`affilate-inject: your code is active here.`, false);
  } else if (detection.present) {
    renderBadge(
      `affilate-inject: another code ("${detection.value}") is on this page. Open the extension to override it with yours.`,
      true,
    );
  } else {
    renderBadge(`affilate-inject: open the extension to apply your code.`, false);
  }
}

void main();

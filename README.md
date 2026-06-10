# affilate-inject

A **bring-your-own-key** browser extension (Manifest V3) that injects **your own**
affiliate ids into shopping URLs on stores you're an approved affiliate of, so the
purchase attributes to you.

> ⚠️ **Use at your own risk — read this first.**
> Earning affiliate commission on **your own purchases** ("self-referral") violates the
> terms of **Amazon Associates and most affiliate programs**. Programs detect it
> (email/IP/payment-method matching), **reverse the commission, and can terminate your
> account**. This tool does **not** try to hide or evade that. It is a personal,
> use-at-your-own-risk utility — you are responsible for how you use it.

## How it is designed (and the line it holds)

It works on a **click-to-override** model, the same user-action mechanic that keeps the
legitimate cashback industry (Rakuten, Capital One Shopping) on the right side of the
law and of [Chrome's affiliate-ads policy](https://developer.chrome.com/docs/webstore/program-policies/affiliate-ads):

- **Never silent.** Nothing is injected in the background. On a supported store you see a
  badge/popup; the override only happens when **you click "Apply my code."**
- **Open about overriding.** If another affiliate code (e.g. a creator's) is already on
  the page, the popup says so *before* you click, and applying replaces it with yours.
- **Out of scope on purpose:** no self-referral **detection-evasion** (no IP/identity/
  email/payment spoofing), and no silent/background overriding. Those are the behaviors
  in active litigation against PayPal/Honey and are not built here.

## How it works technically

- A small **merchant registry** (`src/shared/merchants/*.json`) maps a store to the URL
  query param that carries the affiliate id (e.g. Amazon's `tag`).
- On **Apply**, the background service worker installs a **session-scoped
  [declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)**
  redirect rule, scoped to that one tab, that rewrites the param to your value via
  `queryTransform.addOrReplaceParams`, then reloads the tab. Replacing the value is how it
  overrides a foreign code; a request that already has your value is a no-op redirect, so
  there's no loop.
- Your affiliate ids live only in this browser (`chrome.storage.local`). Nothing is sent
  anywhere (a future "network deep-link" mode would call affiliate networks' own APIs
  using **your** keys).

Currently supported: **Amazon** (`.com`, `.co.uk`, `.de`) via the `tag` param. Add more by
dropping a JSON file in `src/shared/merchants/` and importing it in `src/shared/merchants.ts`.

## Build & load

```bash
npm install
npm run build        # bundles to dist/
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select the `dist/` folder. Open the extension's **Options** to enter your affiliate ids.

> It is **not** intended for the Chrome Web Store. The injection mode may or may not pass
> review, and self-referral is a store-merchant terms issue regardless — expect to run it
> unpacked (Chrome dev mode) or as a self-hosted Firefox add-on.

## Develop

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest (pure logic: matching, detection, rule-building)
npm run watch        # rebuild on change
```

## Why the "own-code on your own purchases" idea is limited

Full research (cited) lives in the planning notes, but the short version: the literal
"earn commission on your own buys" is **self-referral**, which is banned and detected
industry-wide, so commissions get clawed back and accounts terminated. The defensible use
of this tool is **audience-driven** clicks (your own links/site); using it on your own
checkout is the part that violates program terms. No detection-evasion is provided.

## License / disclaimer

Provided as-is, with no warranty, for educational and personal use. Using it to claim
affiliate commissions in violation of a program's terms is your responsibility and may
breach those terms.

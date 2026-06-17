# affilate-inject — Development Specification

**Status:** living document · **Spec version:** 1.0 · **Product version at time of writing:** 0.1.0
**Owner:** packagepal-dev · **Last updated:** 2026-06-17

> ⚠️ **Risk notice.** This project injects the user's *own* affiliate identifiers into
> shopping URLs. Earning affiliate commission on one's *own* purchases ("self-referral")
> violates the terms of Amazon Associates and most affiliate programs and is detected and
> clawed back. This is a **bring-your-own-key, use-at-your-own-risk** personal tool. The
> spec deliberately holds two lines: **(1) never inject/override silently** (everything is
> gated on an explicit user click), and **(2) no fraud-detection-evasion** is designed or
> built. See §3 and §12.

---

## 1. Purpose & overview

affilate-inject is a Manifest V3 (MV3) browser extension that lets a user attach **their
own** affiliate identifier to URLs on stores where they are an approved affiliate, so a
purchase attributes to them rather than to whoever's code happened to be on the link.

It works on a **click-to-override** model: nothing happens in the background; on a
supported store the user sees status and clicks **"Apply my code"** to inject (and, if a
foreign code is present, override) the affiliate parameter for that tab. This is the same
user-action mechanic that keeps the mainstream cashback industry (Rakuten, Capital One
Shopping) on the right side of [Chrome's affiliate-ads policy](https://developer.chrome.com/docs/webstore/program-policies/affiliate-ads).

This document specifies the product's requirements, architecture, data model, component
contracts, build/test strategy, compliance constraints, and a versioned roadmap with
exit criteria. Each functional requirement is tagged **[Implemented]** or **[Planned]**.

---

## 2. Background & rationale (why the design is shaped this way)

Findings that constrain the design (full cited research lives in the project plan):

- **Self-referral is banned & detected.** Amazon Associates: *"You will not purchase any
  Product(s) through Special Links for use by you… Amazon does not pay referral
  commissions for products you purchase through your own links."* Networks detect
  self-referral (email/IP/payment matching) and claw commissions back, terminating
  accounts. → The tool is honest about this and provides **no evasion**.
- **Last-click attribution.** The last affiliate parameter/cookie present at checkout wins
  the commission. Overriding is therefore *technically* possible — but silently overriding
  others' codes is the conduct in active litigation against PayPal/Honey (tortious
  interference, conversion). → Override is allowed **only on explicit user action**.
- **Chrome Web Store policy** requires affiliate injection to have *disclosure + user
  action + direct user benefit*; silent replacement is prohibited. → Drives the
  click-to-override UX and the in-product disclosure.
- **Extensions cannot write third-party cookies.** → Attribution must be via **URL
  parameters** (e.g. Amazon `tag`) or **network deep-links**, never cookie-stuffing.
- **Per-merchant affiliate relationships are required.** A user must already hold an
  approved affiliate id/key per program. → **Bring-your-own-key (BYOK)** model.

---

## 3. Goals & non-goals

### 3.1 Goals
- G1. Let a user store their own affiliate ids/keys locally and apply them per store.
- G2. Apply/override the affiliate parameter **only** on an explicit per-tab user click.
- G3. Transparently surface when a foreign code is present before overriding it.
- G4. Keep all secrets on-device; exfiltrate nothing (future network calls go only to the
  affiliate networks' own APIs using the user's keys).
- G5. Be extensible to many stores via a declarative merchant registry.
- G6. Ship honest in-product disclosure of the legal/ToS risk.

### 3.2 Non-goals (explicitly out of scope, will not build)
- N1. **No silent / background injection or override.** Everything requires a user click.
- N2. **No self-referral detection-evasion** (no IP/identity/email/payment spoofing, no
  cookie-stuffing, no obfuscation to defeat network fraud checks).
- N3. No scraping or storage of other users' affiliate data.
- N4. No claim or guarantee that any commission will actually be paid (governed by each
  program's terms).
- N5. No server-side component in v1 (the extension is fully client-side).

---

## 4. Personas & primary use cases

- **P1 — Audience-driven affiliate (most defensible).** A creator/owner of links or a site
  who wants their own id applied when *they* browse to verify/curate, or to ensure their id
  is used on traffic they influence.
- **P2 — Self-key power user (use-at-your-own-risk).** Applies their own id on their own
  shopping, accepting the self-referral ToS risk documented in-product.

Primary use case (UC-1): On a supported store, the user opens the popup, sees their
configured id and any existing code, clicks **Apply my code**, and the tab reloads with
their affiliate parameter active for that tab's session.

---

## 5. Functional requirements

Status legend: **[I]** Implemented in 0.1.0 · **[P]** Planned.

### 5.1 Configuration & key vault (Options page)
- **FR-1 [I]** The options page renders one text input per distinct `userKeyField` across
  the merchant registry (currently Amazon US/UK/DE → `amazonTagUs|Uk|De`).
- **FR-2 [I]** Entered ids persist to `chrome.storage.local` under key `userKeys`
  (`Record<field,string>`); clearing an input deletes the field.
- **FR-3 [I]** The options page shows the use-at-your-own-risk disclosure and an
  acknowledgement checkbox persisted under `settings.acknowledgedDisclosure`.
- **FR-4 [I]** On first install the service worker opens the options page once.
- **FR-5 [P]** Optional gate: disable Apply until `acknowledgedDisclosure === true`.
- **FR-6 [P]** Import/export of keys (encrypted blob) and per-network API-key fields (v2).

### 5.2 Store detection & status
- **FR-7 [I]** The popup and content script detect the active store by matching the tab URL
  against each merchant's `matches` patterns (`findMerchantForUrl`).
- **FR-8 [I]** On an unsupported site the popup states "Not a supported store" and disables
  actions; the content badge does not render.
- **FR-9 [I]** Existing-code detection (`detectExistingAffiliate`) inspects the merchant's
  `detectExistingParams` (`tag`, `ascsubtag`) and reports `{present, param, value, isYours}`.
- **FR-10 [I]** The content script renders a dismissible in-page badge summarizing status
  (no id set / your code active / foreign code present → override available / apply
  available). Badge is **informational**; it performs no injection.

### 5.3 Apply / override / remove (the core action)
- **FR-11 [I]** The popup exposes **Apply my code** (enabled only when a store is detected
  and the user has an id for it) and **Remove** (enabled only when an override is active).
- **FR-12 [I]** Apply sends `APPLY_CODE {tabId, merchantId}`; the service worker installs a
  **session-scoped** `declarativeNetRequest` redirect rule (id = tabId) scoped to that tab
  that rewrites the merchant's `param` to the user's value via
  `queryTransform.addOrReplaceParams`, then reloads the tab.
- **FR-13 [I]** Override semantics: `addOrReplaceParams` replaces any existing value, so
  Apply overrides a foreign code. A request already carrying the user's value yields an
  identical-URL redirect (no-op), so there is **no redirect loop**.
- **FR-14 [I]** Scope: the rule applies to `main_frame` requests on the merchant's
  `requestDomains`, restricted to the originating tab (`condition.tabIds = [tabId]`). It is
  a **session** rule (cleared on browser restart).
- **FR-15 [I]** Remove sends `CLEAR_CODE {tabId}` → removes the tab's rule and reloads.
- **FR-16 [I]** `GET_TAB_STATE {tabId}` returns `{applied}` by checking session rules.
- **FR-17 [I]** On tab close, the tab's session rule is removed (`tabs.onRemoved`).
- **FR-18 [P]** Strategy dispatch: `applyCode` must branch on `merchant.strategy`. Today it
  always builds a `queryParam` rule; `contentScript`/`networkDeepLink` are not dispatched.
- **FR-19 [P]** Visual confirmation post-apply (badge flips to "your code active") without
  requiring the popup to be reopened.

### 5.4 Merchant registry & extensibility
- **FR-20 [I]** Merchants are declared as JSON (`src/shared/merchants/*.json`) and
  aggregated in `src/shared/merchants.ts` (`MERCHANTS`). Current: `amazon-us/uk/de`.
- **FR-21 [I]** Adding a `queryParam` store = add a JSON file + import it + add its match
  pattern(s) to `manifest.json` `content_scripts` and `host_permissions`.
- **FR-22 [P]** Generate manifest match/host arrays from the registry at build time to keep
  them in sync (today they are maintained by hand in two places).

### 5.5 Injection strategies
- **FR-23 [I]** `queryParam` — rewrite a known URL query parameter (Amazon `tag`).
- **FR-24 [P]** `networkDeepLink` (v2) — call an affiliate network API (Awin/Sovrn/Impact/
  CJ) with the user's own key to mint a tracking URL and redirect to it.
- **FR-25 [P]** `contentScript` fallback — rewrite outbound `<a>` hrefs / current URL in the
  page when DNR transforms are insufficient.

---

## 6. Non-functional requirements

- **NFR-1 Privacy.** No telemetry. Keys never leave the device in v1. v2 network calls go
  only to the relevant affiliate network API over HTTPS, using the user's key.
- **NFR-2 Security.** Keys live in `chrome.storage.local` (extension-isolated; **not**
  encrypted at rest — documented). No remote sync. Minimal permissions (§7).
- **NFR-3 Least privilege.** Host permissions limited to supported merchant domains; no
  `<all_urls>`. DNR rules scoped per tab and per session.
- **NFR-4 Performance.** Apply→reload should add no perceptible latency for `queryParam`
  (single DNR rule). v2 network link minting target < 500 ms; must not block page load.
- **NFR-5 Compatibility.** Chromium MV3 (Chrome/Edge/Brave). Firefox support is a planned
  milestone (MV3 + signed XPI). Safari is out of scope.
- **NFR-6 Reliability.** No redirect loops (FR-13); orphaned rules cleaned on tab close and
  browser restart (session rules).
- **NFR-7 Accessibility.** Popup/options usable via keyboard; labels associated with
  inputs; sufficient contrast. (Audit is **[P]**.)
- **NFR-8 Maintainability.** Pure logic (matching, detection, rule-building) kept free of
  `chrome.*` so it is unit-testable; `chrome.*` confined to thin boundaries.
- **NFR-9 Internationalization.** Copy is English-only in v1; structure does not preclude
  i18n later. **[P]**

---

## 7. Permissions & manifest

- `manifest_version: 3`.
- **permissions:** `declarativeNetRequest`, `storage`, `tabs`.
- **host_permissions:** `*://*.amazon.com/*`, `*://*.amazon.co.uk/*`, `*://*.amazon.de/*`
  (required for DNR redirect on those hosts; expand per merchant).
- **background:** `service-worker.js`, `type: module`.
- **action:** default popup `popup.html`.
- **options_page:** `options.html`.
- **content_scripts:** the Amazon match patterns → `content.js`, `run_at: document_idle`.
- Rationale: `tabs` grants tab `url` for detection and `tabs.reload`; DNR + host
  permissions authorize the redirect; `storage` for the key vault. No `scripting`,
  `webRequest`, `cookies`, or broad host access.

---

## 8. System architecture

```
┌───────────────┐  APPLY_CODE / CLEAR_CODE / GET_TAB_STATE  ┌────────────────────┐
│  Popup (UI)   │ ────────────────────────────────────────▶ │  Service worker     │
│  popup.ts/html│ ◀──────────── ApplyResult / TabState ───── │  service-worker.ts  │
└──────┬────────┘                                            │  + rules-engine.ts  │
       │ reads                                               └─────────┬──────────┘
       ▼                                                               │ updateSessionRules
┌───────────────┐         ┌──────────────────────┐                     ▼
│ shared/storage│◀───────▶│ chrome.storage.local │            chrome.declarativeNetRequest
│  (userKeys,   │         │  userKeys, settings  │            (session, per-tab redirect)
│   settings)   │         └──────────────────────┘                     │
└───────────────┘                                                      ▼ rewrites main_frame
┌────────────────────────┐   detect + badge (informational only)   merchant request gains
│ Content script         │ ───────────────────────────────────────▶ ?<param>=<your id>
│ content.ts             │
└────────────────────────┘
   uses shared/merchants (findMerchantForUrl) + shared/detect-existing
```

**Component responsibilities**
- `src/shared/merchants.ts` — registry + `matchPatternToRegex`, `findMerchantForUrl`,
  `uniqueUserKeyFields`. Pure.
- `src/shared/detect-existing.ts` — `detectExistingAffiliate(url, merchant, userValue?)`.
  Pure.
- `src/shared/storage.ts` — typed wrappers over `chrome.storage.local` (`getUserKeys`,
  `setUserKey`, `getSettings`, `setSettings`).
- `src/background/rules-engine.ts` — `buildOverrideRule(...)` returns a structural
  `OverrideRule` (chrome-free, unit-testable).
- `src/background/service-worker.ts` — message handling, DNR session-rule lifecycle, tab
  cleanup, first-install options open.
- `src/popup/*` — primary action surface (status, warnings, Apply/Remove).
- `src/options/*` — key vault + disclosure.
- `src/content/content.ts` — informational badge only.

---

## 9. Data model & contracts

(From `src/types.ts` — authoritative.)

- `Merchant { id, name, matches[], requestDomains[], strategy, param, userKeyField,
  detectExistingParams[], overrideExistingOnApply }`.
- `UserKeys = Record<string,string>` (field → affiliate id). Storage key: `userKeys`.
- `Settings { acknowledgedDisclosure: boolean }`. Storage key: `settings`.
- `DetectionResult { present, param?, value?, isYours }`.
- Messages: `APPLY_CODE{tabId,merchantId}`, `CLEAR_CODE{tabId}`, `GET_TAB_STATE{tabId}`.
- Responses: `ApplyResult{ok,error?}`, `TabState{applied}`.
- `OverrideRule` (rules-engine) — structural mirror of
  `chrome.declarativeNetRequest.Rule`; id = tabId, priority 1, redirect+queryTransform,
  condition `{requestDomains, resourceTypes:["main_frame"], tabIds:[tabId]}`.

**Invariants**
- One session rule per tab; `ruleId === tabId`.
- Apply requires a non-empty `userKeys[merchant.userKeyField]`.
- Detection never mutates state.

---

## 10. Affiliate integration model

- **v1 (queryParam):** works where the affiliate id is a self-serve URL parameter the user
  already owns — canonically Amazon `tag`. Each Amazon locale needs its **own** tag
  (separate `userKeyField`).
- **v2 (networkDeepLink):** for stores reached via an affiliate network, mint a tracking
  URL through the network's API using the **user's** credentials, then redirect. Requires:
  per-network API client (`src/lib/networks/*`), user-supplied API keys (FR-6), and that
  the user holds an approved account/relationship for that merchant on that network.
- **Attribution reality:** the extension can only *present* the user's id; whether a
  commission is *paid* is governed entirely by program terms (and self-referral is the
  banned case). The product makes no payout guarantee (N4).

---

## 11. Build, tooling & project layout

- **Language/build:** TypeScript; **esbuild** bundles per entry (`build.mjs`): service
  worker + popup + options as **ESM**, content script as **IIFE** (classic content-script
  constraint). Static `manifest.json`/HTML copied to `dist/`.
- **Toolchain (devDependencies):** `typescript ^6`, `esbuild ^0.28`, `vitest ^4`,
  `@types/chrome ^0.1`.
- **Scripts:** `build` (→ `dist/`), `watch`, `typecheck` (`tsc --noEmit`), `test`
  (`vitest run`).
- **Load:** `chrome://extensions` → Developer mode → Load unpacked → `dist/`.
- **Layout:** `src/{background,content,popup,options,shared,lib}`, `tests/`,
  `manifest.json`, `build.mjs`, `docs/`.

---

## 12. Compliance, legal & distribution

- **Self-referral:** prohibited by Amazon and most programs; detected; clawed back;
  account-terminable. Surfaced in README + options + popup. The tool adds no evasion (N2).
- **Chrome Web Store:** click-to-override + upfront disclosure + user benefit *may* satisfy
  the affiliate-ads policy mechanics, but review is discretionary and the merchant ToS
  issue is independent. **Primary distribution = unpacked/self-hosted**; Firefox signed XPI
  is a planned alternative.
- **FTC (16 CFR Part 255):** if used to monetize an audience, the affiliate relationship
  must be disclosed by the user.
- **Privacy law:** no tracking cookies set by the extension; no PII collected; keys are
  local. GDPR/CCPA exposure is minimal in v1 (no data leaves the device).

**Threat model (abuse the project refuses to enable):** silent background hijacking of
creators' commissions; fraud-detection evasion; cookie-stuffing; mass/automated operation.
These are non-goals (N1, N2) and must not be introduced.

---

## 13. Testing & verification strategy

- **Unit (vitest) [I]:** pure logic — `matchPatternToRegex`/`findMerchantForUrl`/
  `uniqueUserKeyFields`, `detectExistingAffiliate`, `buildOverrideRule`. 14 tests passing.
- **Typecheck [I]:** `tsc --noEmit` clean.
- **Build smoke [I]:** `dist/` contains all manifest-referenced files.
- **Manual browser verification [P] — main open gap:** load unpacked; set a tag; on an
  Amazon product URL click Apply and confirm via DevTools Network that the `main_frame`
  request carries `tag=<yourid>`; confirm a foreign `tag` is overridden; confirm **no**
  injection before the click; confirm Remove clears it; confirm unsupported domains do
  nothing.
- **Integration harness [P]:** Playwright/`chrome.debugger`-driven E2E that loads the
  unpacked extension and asserts the redirected URL — automate the manual checks above.
- **Definition of Done (per feature):** unit tests for new pure logic; typecheck + build
  green; for UI/DNR changes, the relevant manual checks pass and are noted in the PR.

---

## 14. Roadmap & milestones (with exit criteria)

- **v0.1 (current) — Amazon queryParam click-to-override.** *Done:* options vault, popup
  Apply/Remove, detection, badge, per-tab session DNR override, unit tests, build.
- **v0.2 — Correctness & verification.** Exit: FR-18 strategy dispatch implemented;
  FR-19 post-apply badge refresh; manual browser verification completed and documented;
  add icons; (optional) FR-22 manifest generated from registry.
- **v0.3 — More queryParam merchants.** Exit: ≥3 additional real `queryParam` stores added
  with tests; registry-driven options/manifest verified.
- **v0.4 — Network deep-links (v2).** Exit: `networkDeepLink` strategy + ≥1 network client
  (e.g. Awin or Sovrn) using user API keys; key-vault fields (FR-6); latency < 500 ms;
  graceful failure when unapproved.
- **v0.5 — Firefox packaging.** Exit: builds to a signed self-hostable XPI; feature parity
  validated on Firefox.
- **v0.6 — E2E harness.** Exit: automated browser test asserting injected/overridden URL in
  CI.
- **v1.0 — Hardening & docs.** Exit: accessibility audit (NFR-7); finalized disclosure UX;
  distribution decision documented; security review of key handling.

---

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| User assumes commissions will be paid on own purchases | Prominent disclosure (README/options/popup); N4; no payout claims |
| Project drifts toward silent hijacking | N1/N2 codified; click-gated by construction; review gate in DoD |
| MV3 DNR limitations / API churn | Pure rule-building isolated; content-script fallback (FR-25) planned |
| Manifest match/host drift from registry | FR-22 build-time generation |
| Keys readable on a compromised device | Documented `storage.local` limitation; optional encrypted export (FR-6) |
| Store removal / ToS action | Unpacked/Firefox distribution; disclosure-first UX |

---

## 16. Open questions

- OQ-1: Gate Apply behind disclosure acknowledgement (FR-5) by default?
- OQ-2: Persist overrides across browser restart (dynamic vs session rules) — or keep
  session-only as a safety default?
- OQ-3: For multi-locale Amazon, auto-pick the locale tag vs require explicit per-locale
  entry (current behavior)?
- OQ-4: Which affiliate network to integrate first in v2 (Awin Link Builder vs Sovrn
  redirect) based on API ergonomics and coverage?

---

## 17. Glossary

- **Affiliate id / tag / key** — the identifier a program issues to credit a referrer.
- **Last-click attribution** — the last affiliate signal before checkout wins the commission.
- **Self-referral** — earning commission on one's own purchase; banned by most programs.
- **DNR** — `chrome.declarativeNetRequest`; declarative request modification in MV3.
- **Session rule** — a DNR rule that lives until browser restart; supports per-tab scoping.
- **BYOK** — bring-your-own-key; the user supplies their own affiliate ids/keys.
- **Stand-down** — voluntarily not overriding an existing affiliate code; here, override is
  instead gated on an explicit user click rather than suppressed.

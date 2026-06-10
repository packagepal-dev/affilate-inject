export type InjectionStrategy = "queryParam" | "contentScript" | "networkDeepLink";

/** A supported store and how to attach the user's affiliate id to its URLs. */
export interface Merchant {
  id: string;
  name: string;
  /** Manifest-style match patterns, e.g. "*://*.amazon.com/*". */
  matches: string[];
  /** declarativeNetRequest condition.requestDomains, e.g. ["amazon.com"]. */
  requestDomains: string[];
  strategy: InjectionStrategy;
  /** Query param that carries the affiliate id (queryParam strategy), e.g. "tag". */
  param: string;
  /** Field in UserKeys holding this merchant's affiliate id. */
  userKeyField: string;
  /** Params whose presence means an affiliate code is already on the URL. */
  detectExistingParams: string[];
  /** Whether clicking Apply replaces an existing code (vs only filling an empty slot). */
  overrideExistingOnApply: boolean;
}

/** field (Merchant.userKeyField) -> the user's own affiliate id. */
export type UserKeys = Record<string, string>;

export interface Settings {
  /** User has seen and acknowledged the use-at-your-own-risk disclosure. */
  acknowledgedDisclosure: boolean;
}

export interface DetectionResult {
  /** An affiliate code is already present on the URL. */
  present: boolean;
  param?: string;
  value?: string;
  /** The present value equals the user's configured id for this merchant. */
  isYours: boolean;
}

export interface ApplyMessage {
  type: "APPLY_CODE";
  tabId: number;
  merchantId: string;
}
export interface ClearMessage {
  type: "CLEAR_CODE";
  tabId: number;
}
export interface TabStateRequest {
  type: "GET_TAB_STATE";
  tabId: number;
}
export type RuntimeMessage = ApplyMessage | ClearMessage | TabStateRequest;

export interface ApplyResult {
  ok: boolean;
  error?: string;
}
export interface TabState {
  applied: boolean;
}

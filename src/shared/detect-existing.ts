import type { Merchant, DetectionResult } from "../types";

/**
 * Inspect a URL for an already-present affiliate code. This only INFORMS the
 * user (so the popup can warn "a code is already here — Apply will override
 * it"); it never suppresses or acts on its own.
 */
export function detectExistingAffiliate(
  rawUrl: string,
  merchant: Merchant,
  userValue?: string,
): DetectionResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { present: false, isYours: false };
  }
  for (const param of merchant.detectExistingParams) {
    const value = url.searchParams.get(param);
    if (value != null && value !== "") {
      return {
        present: true,
        param,
        value,
        isYours: userValue != null && userValue !== "" && value === userValue,
      };
    }
  }
  return { present: false, isYours: false };
}

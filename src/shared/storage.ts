import type { UserKeys, Settings } from "../types";

const KEYS_KEY = "userKeys";
const SETTINGS_KEY = "settings";

const DEFAULT_SETTINGS: Settings = { acknowledgedDisclosure: false };

export async function getUserKeys(): Promise<UserKeys> {
  const stored = await chrome.storage.local.get(KEYS_KEY);
  return (stored[KEYS_KEY] as UserKeys | undefined) ?? {};
}

export async function setUserKey(field: string, value: string): Promise<void> {
  const keys = await getUserKeys();
  if (value) {
    keys[field] = value;
  } else {
    delete keys[field];
  }
  await chrome.storage.local.set({ [KEYS_KEY]: keys });
}

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...patch } });
}

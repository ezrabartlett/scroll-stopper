export interface StorageData {
  deepFocusEnabled: boolean;
  distractionSites: string[];
  allowedDuringFocus: string[];
}

const DEFAULTS: StorageData = {
  deepFocusEnabled: false,
  distractionSites: [],
  allowedDuringFocus: [],
};

export async function getStorage(): Promise<StorageData> {
  const result = await chrome.storage.sync.get(DEFAULTS);
  return result as StorageData;
}

export async function setStorage(
  data: Partial<StorageData>
): Promise<void> {
  await chrome.storage.sync.set(data);
}

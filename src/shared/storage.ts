export interface StorageData {
  deepFocusEnabled: boolean;
  deepFocusEndTime: number | null;
  distractionSites: string[];
  allowedDuringFocus: string[];
}

const DEFAULTS: StorageData = {
  deepFocusEnabled: false,
  deepFocusEndTime: null,
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

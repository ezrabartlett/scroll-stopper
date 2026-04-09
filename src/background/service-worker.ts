import { getStorage, setStorage } from "../shared/storage";

const DEFAULT_BYPASS_MINUTES = 10;

function domainMatches(hostname: string, pattern: string): boolean {
  return hostname === pattern || hostname.endsWith(`.${pattern}`);
}

function matchesList(hostname: string, domains: string[]): boolean {
  return domains.some((d) => domainMatches(hostname, d));
}

function isDomainBypassed(hostname: string, bypasses: Record<string, number>): boolean {
  const now = Date.now();
  for (const [domain, expiry] of Object.entries(bypasses)) {
    if (domainMatches(hostname, domain) && expiry > now) return true;
  }
  return false;
}

function pruneExpired(bypasses: Record<string, number>): Record<string, number> {
  const now = Date.now();
  const result: Record<string, number> = {};
  for (const [domain, expiry] of Object.entries(bypasses)) {
    if (expiry > now) result[domain] = expiry;
  }
  return result;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;

  let url: URL;
  try {
    url = new URL(changeInfo.url);
  } catch {
    return;
  }

  if (!url.protocol.startsWith("http")) return;

  const data = await getStorage();

  if (data.deepFocusEnabled && data.deepFocusEndTime && Date.now() >= data.deepFocusEndTime) {
    await setStorage({ deepFocusEnabled: false, deepFocusEndTime: null });
    data.deepFocusEnabled = false;
  }

  if (data.deepFocusEnabled) {
    if (Object.keys(data.bypasses).length > 0) {
      await setStorage({ bypasses: {} });
    }
    if (!matchesList(url.hostname, data.allowedDuringFocus)) {
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL(
          `blocked.html?reason=deep_focus&url=${encodeURIComponent(changeInfo.url)}`
        ),
      });
    }
    return;
  }

  if (matchesList(url.hostname, data.distractionSites)) {
    if (isDomainBypassed(url.hostname, data.bypasses)) return;

    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL(
        `blocked.html?reason=distraction&url=${encodeURIComponent(changeInfo.url)}`
      ),
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "bypass" && msg.url && sender.tab?.id) {
    const tabId = sender.tab.id;
    getStorage().then(async (data) => {
      const minutes = data.bypassTimeMinutes ?? DEFAULT_BYPASS_MINUTES;
      const durationMs = minutes * 60 * 1000;
      try {
        const url = new URL(msg.url);
        const bypasses = pruneExpired(data.bypasses);
        bypasses[url.hostname] = Date.now() + durationMs;
        await setStorage({ bypasses });
      } catch { /* ignore malformed URLs */ }
      chrome.tabs.update(tabId, { url: msg.url });
    });
    return true;
  }

  if (msg.type === "getBypasses") {
    getStorage().then(async (data) => {
      const active = pruneExpired(data.bypasses);
      if (Object.keys(active).length !== Object.keys(data.bypasses).length) {
        await setStorage({ bypasses: active });
      }
      sendResponse(active);
    });
    return true;
  }

  if (msg.type === "clearBypasses") {
    setStorage({ bypasses: {} });
  }

  if (msg.type === "relockDomain" && msg.domain) {
    getStorage().then(async (data) => {
      const bypasses = { ...data.bypasses };
      delete bypasses[msg.domain];
      await setStorage({ bypasses });
    });
    return true;
  }
});

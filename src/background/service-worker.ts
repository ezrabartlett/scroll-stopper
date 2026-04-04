import { getStorage, setStorage } from "../shared/storage";

const DEFAULT_BYPASS_MINUTES = 10;

// Maps domain -> expiry timestamp
const bypassMap = new Map<string, number>();

function domainMatches(hostname: string, pattern: string): boolean {
  return hostname === pattern || hostname.endsWith(`.${pattern}`);
}

function matchesList(hostname: string, domains: string[]): boolean {
  return domains.some((d) => domainMatches(hostname, d));
}

function isDomainBypassed(hostname: string): boolean {
  for (const [domain, expiry] of bypassMap) {
    if (domainMatches(hostname, domain)) {
      if (Date.now() < expiry) return true;
      bypassMap.delete(domain);
    }
  }
  return false;
}

function extractMatchingDomain(hostname: string, domains: string[]): string | null {
  for (const d of domains) {
    if (domainMatches(hostname, d)) return d;
  }
  return null;
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  let url: URL;
  try {
    url = new URL(details.url);
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
    bypassMap.clear();
    if (!matchesList(url.hostname, data.allowedDuringFocus)) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL(
          `blocked.html?reason=deep_focus&url=${encodeURIComponent(details.url)}`
        ),
      });
    }
    return;
  }

  if (matchesList(url.hostname, data.distractionSites)) {
    if (isDomainBypassed(url.hostname)) return;

    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL(
        `blocked.html?reason=distraction&url=${encodeURIComponent(details.url)}`
      ),
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "bypass" && msg.url && sender.tab?.id) {
    const tabId = sender.tab.id;
    getStorage().then((data) => {
      const minutes = data.bypassTimeMinutes ?? DEFAULT_BYPASS_MINUTES;
      const durationMs = minutes * 60 * 1000;
      try {
        const url = new URL(msg.url);
        bypassMap.set(url.hostname, Date.now() + durationMs);
      } catch { /* ignore malformed URLs */ }
      chrome.tabs.update(tabId, { url: msg.url });
    });
    return true;
  }

  if (msg.type === "getBypasses") {
    const now = Date.now();
    const active: Record<string, number> = {};
    for (const [domain, expiry] of bypassMap) {
      if (expiry > now) {
        active[domain] = expiry;
      } else {
        bypassMap.delete(domain);
      }
    }
    sendResponse(active);
  }

  if (msg.type === "clearBypasses") {
    bypassMap.clear();
  }
});

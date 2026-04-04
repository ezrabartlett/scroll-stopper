import { getStorage, setStorage } from "../shared/storage";

const BYPASS_DURATION_MS = 20 * 1000;

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
    try {
      const url = new URL(msg.url);
      bypassMap.set(url.hostname, Date.now() + BYPASS_DURATION_MS);
    } catch {
      // ignore malformed URLs
    }
    chrome.tabs.update(sender.tab.id, { url: msg.url });
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

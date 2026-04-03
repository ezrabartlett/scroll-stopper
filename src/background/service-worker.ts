import { getStorage, setStorage } from "../shared/storage";

const bypassSet = new Set<string>();

function domainMatches(hostname: string, pattern: string): boolean {
  return hostname === pattern || hostname.endsWith(`.${pattern}`);
}

function matchesList(hostname: string, domains: string[]): boolean {
  return domains.some((d) => domainMatches(hostname, d));
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

  if (bypassSet.has(details.url)) {
    bypassSet.delete(details.url);
    return;
  }

  const data = await getStorage();

  if (data.deepFocusEnabled && data.deepFocusEndTime && Date.now() >= data.deepFocusEndTime) {
    await setStorage({ deepFocusEnabled: false, deepFocusEndTime: null });
    data.deepFocusEnabled = false;
  }

  if (data.deepFocusEnabled) {
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
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL(
        `blocked.html?reason=distraction&url=${encodeURIComponent(details.url)}`
      ),
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "bypass" && msg.url && sender.tab?.id) {
    bypassSet.add(msg.url);
    chrome.tabs.update(sender.tab.id, { url: msg.url });
  }
});

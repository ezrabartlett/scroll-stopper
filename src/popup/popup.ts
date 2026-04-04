import "../styles/input.css";
import { getStorage, setStorage, StorageData } from "../shared/storage";

type ListKey = "distractionSites" | "allowedDuringFocus";

interface ListElements {
  list: HTMLUListElement;
  empty: HTMLParagraphElement;
  addBtn: HTMLButtonElement;
  addRow: HTMLDivElement;
  input: HTMLInputElement;
  confirm: HTMLButtonElement;
  cancel: HTMLButtonElement;
  error: HTMLParagraphElement;
}

function getListElements(prefix: string): ListElements {
  return {
    list: document.getElementById(`${prefix}-list`) as HTMLUListElement,
    empty: document.getElementById(`${prefix}-empty`) as HTMLParagraphElement,
    addBtn: document.getElementById(`${prefix}-add-btn`) as HTMLButtonElement,
    addRow: document.getElementById(`${prefix}-add-row`) as HTMLDivElement,
    input: document.getElementById(`${prefix}-input`) as HTMLInputElement,
    confirm: document.getElementById(`${prefix}-confirm`) as HTMLButtonElement,
    cancel: document.getElementById(`${prefix}-cancel`) as HTMLButtonElement,
    error: document.getElementById(`${prefix}-error`) as HTMLParagraphElement,
  };
}

function setupList(prefix: string, storageKey: ListKey) {
  const els = getListElements(prefix);

  async function render() {
    const data = await getStorage();
    const domains = data[storageKey];

    els.list.innerHTML = "";
    els.empty.classList.toggle("hidden", domains.length > 0);

    for (const domain of domains) {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-1.5";

      const span = document.createElement("span");
      span.className = "text-xs";
      span.textContent = domain;

      const removeBtn = document.createElement("button");
      removeBtn.className = "text-xs text-red-400 hover:text-red-600 font-medium ml-2";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", async () => {
        const data = await getStorage();
        const updated = data[storageKey].filter((d) => d !== domain);
        await setStorage({ [storageKey]: updated } as Partial<StorageData>);
        await render();
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      els.list.appendChild(li);
    }
  }

  function showAddRow() {
    els.addRow.classList.remove("hidden");
    els.addBtn.classList.add("hidden");
    els.input.value = "";
    els.input.focus();
  }

  function hideAddRow() {
    els.addRow.classList.add("hidden");
    els.addBtn.classList.remove("hidden");
    els.error.classList.add("hidden");
  }

  function isValidDomain(value: string): boolean {
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value);
  }

  async function addDomain() {
    const cleaned = els.input.value.trim().toLowerCase();
    if (!cleaned) return;

    if (!isValidDomain(cleaned)) {
      els.error.textContent = "Please enter a valid domain, e.g. reddit.com";
      els.error.classList.remove("hidden");
      return;
    }

    els.error.classList.add("hidden");

    const data = await getStorage();
    const list = data[storageKey];
    if (!list.includes(cleaned)) {
      list.push(cleaned);
      await setStorage({ [storageKey]: list } as Partial<StorageData>);
    }

    hideAddRow();
    await render();
  }

  els.addBtn.addEventListener("click", showAddRow);
  els.cancel.addEventListener("click", hideAddRow);
  els.confirm.addEventListener("click", addDomain);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDomain();
    if (e.key === "Escape") hideAddRow();
  });

  render();
}

const focusToggle = document.getElementById("focus-toggle") as HTMLInputElement;
const focusModal = document.getElementById("focus-modal") as HTMLDivElement;
const focusMinutesInput = document.getElementById("focus-minutes") as HTMLInputElement;
const focusStart = document.getElementById("focus-start") as HTMLButtonElement;
const focusCancel = document.getElementById("focus-cancel") as HTMLButtonElement;
const focusBanner = document.getElementById("focus-banner") as HTMLDivElement;
const focusCountdown = document.getElementById("focus-countdown") as HTMLSpanElement;

let countdownInterval: ReturnType<typeof setInterval> | null = null;

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function startCountdown(endTime: number) {
  stopCountdown();
  function tick() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      stopCountdown();
      focusBanner.classList.add("hidden");
      focusToggle.checked = false;
      setStorage({ deepFocusEnabled: false, deepFocusEndTime: null });
      return;
    }
    focusCountdown.textContent = formatCountdown(remaining);
  }
  focusBanner.classList.remove("hidden");
  tick();
  countdownInterval = setInterval(tick, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  focusBanner.classList.add("hidden");
}

const endModal = document.getElementById("end-modal") as HTMLDivElement;
const endCancel = document.getElementById("end-cancel") as HTMLButtonElement;
const endConfirm = document.getElementById("end-confirm") as HTMLButtonElement;

focusToggle.addEventListener("change", () => {
  if (focusToggle.checked) {
    focusMinutesInput.value = "15";
    focusModal.classList.remove("hidden");
    focusMinutesInput.focus();
  } else {
    focusToggle.checked = true;
    endModal.classList.remove("hidden");
  }
});

endConfirm.addEventListener("click", () => {
  endModal.classList.add("hidden");
  focusToggle.checked = false;
  stopCountdown();
  setStorage({ deepFocusEnabled: false, deepFocusEndTime: null });
});

endCancel.addEventListener("click", () => {
  endModal.classList.add("hidden");
});

focusStart.addEventListener("click", async () => {
  const minutes = parseInt(focusMinutesInput.value, 10);
  if (!minutes || minutes < 1) return;
  const endTime = Date.now() + minutes * 60 * 1000;
  await setStorage({ deepFocusEnabled: true, deepFocusEndTime: endTime });
  await chrome.runtime.sendMessage({ type: "clearBypasses" });
  focusModal.classList.add("hidden");
  startCountdown(endTime);
  renderBypasses();
});

focusMinutesInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") focusStart.click();
  if (e.key === "Escape") focusCancel.click();
});

focusCancel.addEventListener("click", () => {
  focusToggle.checked = false;
  focusModal.classList.add("hidden");
  setStorage({ deepFocusEnabled: false, deepFocusEndTime: null });
});

async function init() {
  const data = await getStorage();
  focusToggle.checked = data.deepFocusEnabled;
  if (data.deepFocusEnabled && data.deepFocusEndTime) {
    if (Date.now() >= data.deepFocusEndTime) {
      await setStorage({ deepFocusEnabled: false, deepFocusEndTime: null });
      focusToggle.checked = false;
    } else {
      startCountdown(data.deepFocusEndTime);
    }
  }
}

const mainView = document.getElementById("main-view") as HTMLDivElement;
const settingsView = document.getElementById("settings-view") as HTMLDivElement;
const distractionView = document.getElementById("distraction-view") as HTMLDivElement;
const allowedView = document.getElementById("allowed-view") as HTMLDivElement;

const settingsBtn = document.getElementById("settings-btn") as HTMLButtonElement;
const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
const navDistraction = document.getElementById("nav-distraction") as HTMLButtonElement;
const navAllowed = document.getElementById("nav-allowed") as HTMLButtonElement;
const distractionBackBtn = document.getElementById("distraction-back-btn") as HTMLButtonElement;
const allowedBackBtn = document.getElementById("allowed-back-btn") as HTMLButtonElement;

const allViews = [mainView, settingsView, distractionView, allowedView];

function showView(view: HTMLDivElement) {
  allViews.forEach((v) => v.classList.add("hidden"));
  view.classList.remove("hidden");
}

settingsBtn.addEventListener("click", () => showView(settingsView));
backBtn.addEventListener("click", () => showView(mainView));
navDistraction.addEventListener("click", () => showView(distractionView));
navAllowed.addEventListener("click", () => showView(allowedView));
distractionBackBtn.addEventListener("click", () => showView(mainView));
allowedBackBtn.addEventListener("click", () => showView(mainView));

const bypassBanners = document.getElementById("bypass-banners") as HTMLDivElement;
let bypassInterval: ReturnType<typeof setInterval> | null = null;

function formatBypassTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${m}:${pad(s)}`;
}

async function renderBypasses() {
  const bypasses: Record<string, number> = await chrome.runtime.sendMessage({ type: "getBypasses" });
  const now = Date.now();
  const active = Object.entries(bypasses).filter(([, expiry]) => expiry > now);

  bypassBanners.innerHTML = "";

  if (active.length === 0) {
    if (bypassInterval) {
      clearInterval(bypassInterval);
      bypassInterval = null;
    }
    return;
  }

  for (const [domain, expiry] of active) {
    const banner = document.createElement("div");
    banner.className = "flex items-center justify-between py-2 px-3 bg-green-50 border-b border-green-200";

    const label = document.createElement("span");
    label.className = "text-xs font-medium text-green-700";
    label.textContent = `${domain} unlocked`;

    const timer = document.createElement("span");
    timer.className = "text-xs font-mono text-green-700";
    timer.textContent = formatBypassTime(expiry - now);

    banner.appendChild(label);
    banner.appendChild(timer);
    bypassBanners.appendChild(banner);
  }

  if (!bypassInterval) {
    bypassInterval = setInterval(renderBypasses, 1000);
  }
}

const waitTimeInput = document.getElementById("wait-time-input") as HTMLInputElement;

waitTimeInput.addEventListener("change", async () => {
  const val = parseInt(waitTimeInput.value, 10);
  if (!isNaN(val) && val >= 0) {
    await setStorage({ waitTimeSeconds: val });
  }
});

const bypassTimeInput = document.getElementById("bypass-time-input") as HTMLInputElement;

bypassTimeInput.addEventListener("change", async () => {
  const val = parseInt(bypassTimeInput.value, 10);
  if (!isNaN(val) && val >= 0) {
    await setStorage({ bypassTimeMinutes: val });
  }
});

async function initSettings() {
  const data = await getStorage();
  waitTimeInput.value = String(data.waitTimeSeconds);
  bypassTimeInput.value = String(data.bypassTimeMinutes);
}

setupList("distraction", "distractionSites");
setupList("allowed", "allowedDuringFocus");
init();
initSettings();
renderBypasses();

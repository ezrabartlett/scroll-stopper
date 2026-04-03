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
  }

  async function addDomain() {
    const cleaned = els.input.value.trim().toLowerCase();
    if (!cleaned) return;

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

async function init() {
  const data = await getStorage();
  focusToggle.checked = data.deepFocusEnabled;
}

focusToggle.addEventListener("change", async () => {
  await setStorage({ deepFocusEnabled: focusToggle.checked });
});

setupList("distraction", "distractionSites");
setupList("allowed", "allowedDuringFocus");
init();

import "../styles/input.css";
import { getStorage, setStorage, StorageData } from "../shared/storage";

getStorage().then((data) => {
  document.documentElement.classList.toggle("dark", data.darkModeEnabled);
});

type ListKey = "distractionSites" | "allowedDuringFocus";

const params = new URLSearchParams(window.location.search);
const listParam = params.get("list");
const storageKey: ListKey =
  listParam === "allowed" ? "allowedDuringFocus" : "distractionSites";

const titles: Record<ListKey, string> = {
  distractionSites: "Distraction Sites",
  allowedDuringFocus: "Allowed During Deep Focus",
};

const pageTitle = document.getElementById("page-title") as HTMLHeadingElement;
const domainList = document.getElementById("domain-list") as HTMLUListElement;
const emptyMsg = document.getElementById("empty-msg") as HTMLParagraphElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const modal = document.getElementById("modal") as HTMLDivElement;
const domainInput = document.getElementById("domain-input") as HTMLInputElement;
const modalCancel = document.getElementById("modal-cancel") as HTMLButtonElement;
const modalConfirm = document.getElementById("modal-confirm") as HTMLButtonElement;

pageTitle.textContent = titles[storageKey];

async function render() {
  const data = await getStorage();
  const domains = data[storageKey];

  domainList.innerHTML = "";
  emptyMsg.classList.toggle("hidden", domains.length > 0);

  for (const domain of domains) {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between bg-surface-raised border border-line rounded-lg px-4 py-2.5";

    const span = document.createElement("span");
    span.className = "text-sm";
    span.textContent = domain;

    const removeBtn = document.createElement("button");
    removeBtn.className = "text-xs text-danger hover:text-danger-strong font-medium";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeDomain(domain));

    li.appendChild(span);
    li.appendChild(removeBtn);
    domainList.appendChild(li);
  }
}

async function addDomain(domain: string) {
  const cleaned = domain.trim().toLowerCase();
  if (!cleaned) return;

  const data = await getStorage();
  const list = data[storageKey];
  if (list.includes(cleaned)) return;

  list.push(cleaned);
  await setStorage({ [storageKey]: list } as Partial<StorageData>);
  await render();
}

async function removeDomain(domain: string) {
  const data = await getStorage();
  const list = data[storageKey].filter((d) => d !== domain);
  await setStorage({ [storageKey]: list } as Partial<StorageData>);
  await render();
}

function openModal() {
  domainInput.value = "";
  modal.classList.remove("hidden");
  domainInput.focus();
}

function closeModal() {
  modal.classList.add("hidden");
}

addBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);

modalConfirm.addEventListener("click", async () => {
  await addDomain(domainInput.value);
  closeModal();
});

domainInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    await addDomain(domainInput.value);
    closeModal();
  }
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

render();

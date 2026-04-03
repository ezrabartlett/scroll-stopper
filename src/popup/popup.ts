import "../styles/input.css";
import { getStorage, setStorage } from "../shared/storage";

const focusToggle = document.getElementById("focus-toggle") as HTMLInputElement;
const editDistraction = document.getElementById("edit-distraction") as HTMLButtonElement;
const editAllowed = document.getElementById("edit-allowed") as HTMLButtonElement;

async function init() {
  const data = await getStorage();
  focusToggle.checked = data.deepFocusEnabled;
}

focusToggle.addEventListener("change", async () => {
  await setStorage({ deepFocusEnabled: focusToggle.checked });
});

editDistraction.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("edit-list.html?list=distraction") });
});

editAllowed.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("edit-list.html?list=allowed") });
});

init();

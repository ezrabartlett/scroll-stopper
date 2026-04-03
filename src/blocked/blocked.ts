import "../styles/input.css";

const params = new URLSearchParams(window.location.search);
const reason = params.get("reason");
const originalUrl = params.get("url") || "";

const deepFocusView = document.getElementById("deep-focus-view") as HTMLDivElement;
const distractionView = document.getElementById("distraction-view") as HTMLDivElement;
const blockedUrl = document.getElementById("blocked-url") as HTMLParagraphElement;
const continueBtn = document.getElementById("continue-btn") as HTMLButtonElement;

if (reason === "deep_focus") {
  deepFocusView.classList.remove("hidden");
} else {
  distractionView.classList.remove("hidden");
  blockedUrl.textContent = originalUrl;
}

continueBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "bypass", url: originalUrl });
});

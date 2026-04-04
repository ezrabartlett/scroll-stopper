import "../styles/input.css";
import { getStorage } from "../shared/storage";

const params = new URLSearchParams(window.location.search);
const reason = params.get("reason");
const originalUrl = params.get("url") || "";

const deepFocusView = document.getElementById("deep-focus-view") as HTMLDivElement;
const distractionView = document.getElementById("distraction-view") as HTMLDivElement;
const blockedUrl = document.getElementById("blocked-url") as HTMLParagraphElement;
const continueBtn = document.getElementById("continue-btn") as HTMLButtonElement;
const btnFill = document.getElementById("btn-fill") as HTMLDivElement;

if (reason === "deep_focus") {
  deepFocusView.classList.remove("hidden");
} else {
  distractionView.classList.remove("hidden");
  blockedUrl.textContent = originalUrl;

  getStorage().then((data) => {
    const waitSeconds = data.waitTimeSeconds;
    const startTime = Date.now();
    const duration = waitSeconds * 1000;

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 1 - elapsed / duration);
      btnFill.style.transform = `scaleX(${progress})`;

      if (progress > 0) {
        requestAnimationFrame(animate);
      } else {
        btnFill.style.transform = "scaleX(0)";
        continueBtn.disabled = false;
        continueBtn.classList.add("hover:bg-gray-300", "cursor-pointer");
      }
    }

    requestAnimationFrame(animate);
  });
}

continueBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "bypass", url: originalUrl });
});

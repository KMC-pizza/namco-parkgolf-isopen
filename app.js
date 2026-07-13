const STATUS_META = {
  OPEN: {
    label: "운영",
    color: "#15803d",
    background: "#ecfdf3"
  },
  CLOSED: {
    label: "휴장",
    color: "#dc2626",
    background: "#fef2f2"
  },
  SCHEDULED_CLOSE: {
    label: "휴장예정",
    color: "#d97706",
    background: "#fffbeb"
  }
};

const STORAGE_KEY = "namgu-facility-interests";
let facilities = [];
let deferredInstallPrompt = null;

const facilityList = document.querySelector("#facilityList");
const interestList = document.querySelector("#interestList");
const lastUpdated = document.querySelector("#lastUpdated");
const currentTime = document.querySelector("#currentTime");
const installButton = document.querySelector("#installButton");
const refreshButton = document.querySelector("#refreshButton");

async function loadFacilities() {
  facilityList.innerHTML = '<div class="loading-message">운영상태를 불러오는 중입니다.</div>';

  try {
    const response = await fetch(`./data/status.json?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    facilities = payload.facilities ?? [];
    lastUpdated.textContent = formatDateTime(payload.updatedAt);
    renderFacilities();
    renderInterests();
  } catch (error) {
    console.error(error);
    facilityList.innerHTML = `
      <div class="error-message">
        운영상태를 불러오지 못했습니다.<br />
        잠시 후 다시 시도해 주세요.
      </div>
    `;
  }
}

function renderFacilities() {
  facilityList.innerHTML = facilities.map((facility) => {
    const meta = STATUS_META[facility.status] ?? STATUS_META.CLOSED;

    return `
      <article
        class="facility-card"
        style="--status-color:${meta.color}; --status-bg:${meta.background};"
      >
        <div class="facility-top">
          <div>
            <h3 class="facility-name">${escapeHtml(facility.name)}</h3>
            <p class="facility-hours">
              운영시간 ${escapeHtml(facility.hours)} · 휴장일 ${escapeHtml(facility.closedDay)}
            </p>
          </div>
          <span class="status-badge">${meta.label}</span>
        </div>
        <p class="facility-detail">
          ${escapeHtml(facility.reason || "정상 운영 중입니다.")}
          <span class="updated-time">변경 ${formatDateTime(facility.updatedAt)}</span>
        </p>
      </article>
    `;
  }).join("");
}

function renderInterests() {
  const interests = getSavedInterests();

  interestList.innerHTML = facilities.map((facility) => `
    <div class="interest-item">
      <label for="interest-${facility.id}">${escapeHtml(facility.name)}</label>
      <input
        id="interest-${facility.id}"
        type="checkbox"
        value="${facility.id}"
        ${interests.includes(facility.id) ? "checked" : ""}
      />
    </div>
  `).join("");

  interestList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", saveInterests);
  });
}

function getSavedInterests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveInterests() {
  const selected = [...interestList.querySelectorAll("input:checked")]
    .map((input) => input.value);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
}

function updateClock() {
  currentTime.textContent = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

refreshButton.addEventListener("click", loadFacilities);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => console.error("Service Worker 등록 실패:", error));
  });
}

updateClock();
setInterval(updateClock, 60_000);
loadFacilities();

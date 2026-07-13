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
const lastUpdated = document.querySelector("#lastUpdated");
const currentTime = document.querySelector("#currentTime");
const installButton = document.querySelector("#installButton");
const refreshButton = document.querySelector("#refreshButton");

async function loadFacilities() {
  facilityList.innerHTML = `
    <div class="loading-message">운영상태를 불러오는 중입니다.</div>
  `;

  try {
    const response = await fetch(`./data/status.json?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    facilities = Array.isArray(payload.facilities)
      ? payload.facilities
      : [];

    lastUpdated.textContent = formatDateTime(payload.updatedAt);
    renderFacilities();
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
  const interests = getSavedInterests();

  facilityList.innerHTML = facilities.map((facility) => {
    const meta = STATUS_META[facility.status] ?? STATUS_META.CLOSED;
    const isFavorite = interests.includes(facility.id);

    return `
      <article
        class="facility-card"
        style="--status-color:${meta.color}; --status-bg:${meta.background};"
      >
        <div class="facility-main-row">
          <button
            class="favorite-button${isFavorite ? " is-favorite" : ""}"
            type="button"
            data-facility-id="${escapeHtml(facility.id)}"
            aria-label="${escapeHtml(facility.name)} 관심시설 ${isFavorite ? "해제" : "등록"}"
            aria-pressed="${isFavorite}"
            title="${isFavorite ? "관심시설 해제" : "관심시설 등록"}"
          >
            ${isFavorite ? "★" : "☆"}
          </button>

          <div class="facility-name-wrap">
            <h3 class="facility-name">${escapeHtml(facility.name)}</h3>
          </div>

          <span class="status-badge">${meta.label}</span>
        </div>

        <div class="facility-meta">
          <span>운영시간 ${escapeHtml(facility.hours || "-")}</span>
          <span>휴장일 ${escapeHtml(facility.closedDay || "-")}</span>
        </div>
      </article>
    `;
  }).join("");

  facilityList
    .querySelectorAll(".favorite-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        toggleInterest(button.dataset.facilityId);
      });
    });
}

function getSavedInterests() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function toggleInterest(facilityId) {
  const interests = getSavedInterests();
  const nextInterests = interests.includes(facilityId)
    ? interests.filter((id) => id !== facilityId)
    : [...interests, facilityId];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextInterests));
  renderFacilities();
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
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
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => {
        console.error("Service Worker 등록 실패:", error);
      });
  });
}

updateClock();
setInterval(updateClock, 60_000);
loadFacilities();

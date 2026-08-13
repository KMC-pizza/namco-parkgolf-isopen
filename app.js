import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { db } from "./firebase-client.js";

const STATUS_META = {
  OPEN: { label: "운영중", color: "#15803d", background: "#ecfdf3" },
  CLOSED: { label: "휴장", color: "#dc2626", background: "#fef2f2" },
  SCHEDULED_CLOSE: { label: "휴장예정", color: "#d97706", background: "#fffbeb" },
  TEMPORARY_CLOSED: { label: "임시 운영중단", color: "#dc2626", background: "#fef2f2" }
};

const config = window.NAMCO_CONFIG;
const facilityCard = document.querySelector("#facilityCard");
const lastUpdated = document.querySelector("#lastUpdated");
const currentTime = document.querySelector("#currentTime");
const installButton = document.querySelector("#installButton");
const refreshButton = document.querySelector("#refreshButton");

let deferredInstallPrompt = null;
let unsubscribeStatus = null;
let fallbackLoaded = false;

function renderFacility(facility) {
  const meta = STATUS_META[facility.status] ?? STATUS_META.CLOSED;
  const reason = facility.reason?.trim();
  const notice = facility.notice?.trim();

  facilityCard.innerHTML = `
    <article
      class="facility-card single-facility-card"
      style="--status-color:${meta.color}; --status-bg:${meta.background};"
    >
      <div class="facility-main-row single-row">
        <div class="facility-name-wrap">
          <h3 class="facility-name">${escapeHtml(facility.name || "남구파크골프장")}</h3>
        </div>
        <span class="status-badge">${meta.label}</span>
      </div>

      ${reason ? `
        <div class="status-reason">
          <span>사유</span>
          <strong>${escapeHtml(reason)}</strong>
        </div>
      ` : ""}

      ${notice ? `<p class="facility-notice">${escapeHtml(notice)}</p>` : ""}

      <div class="facility-meta">
        <span><b>운영시간</b> ${escapeHtml(facility.hours || "-")}</span>
        <span><b>정기휴장</b> ${escapeHtml(facility.closedDay || "-")}</span>
      </div>
    </article>
  `;

  lastUpdated.textContent = formatDateTime(facility.updatedAt);
}

async function loadFallbackStatus() {
  if (fallbackLoaded) return;
  fallbackLoaded = true;

  try {
    const response = await fetch(`./data/status.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderFacility(payload);
  } catch (error) {
    console.error(error);
    facilityCard.innerHTML = `
      <div class="error-message">
        운영상태를 불러오지 못했습니다.<br />잠시 후 다시 시도해 주세요.
      </div>
    `;
  }
}

function subscribeRealtimeStatus() {
  if (unsubscribeStatus) unsubscribeStatus();
  fallbackLoaded = false;

  const statusRef = doc(db, "facilities", config.facilityId);

  unsubscribeStatus = onSnapshot(
    statusRef,
    (snapshot) => {
      if (snapshot.exists()) {
        renderFacility({ id: snapshot.id, ...snapshot.data() });
        return;
      }
      loadFallbackStatus();
    },
    (error) => {
      console.error("Firestore 운영상태 조회 실패:", error);
      loadFallbackStatus();
    }
  );
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

  const date = typeof value?.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

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

refreshButton.addEventListener("click", subscribeRealtimeStatus);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Service Worker 등록 실패:", error);
    });
  });
}

updateClock();
setInterval(updateClock, 60_000);
subscribeRealtimeStatus();

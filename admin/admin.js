const CONFIG = window.NAMCO_CONFIG ?? {};
const STATUS_LABELS = {
  OPEN: "운영",
  CLOSED: "휴장",
  SCHEDULED_CLOSE: "휴장예정"
};
const MOCK_STATUS_KEY = "namco-admin-mock-status";
const MOCK_HISTORY_KEY = "namco-admin-mock-history";
const SESSION_KEY = "namco-admin-session";

let currentPayload = null;
let selectedFacility = null;

const $ = (selector) => document.querySelector(selector);

function setMessage(selector, message, isError = false) {
  const element = $(selector);
  element.textContent = message;
  element.style.color = isError ? "#c62828" : "#0f766e";
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

function showManager() {
  $("#loginPanel").hidden = true;
  $("#managerPanel").hidden = false;
  $("#logoutButton").hidden = false;
  $("#modeBanner").textContent = CONFIG.mockMode
    ? "현재 시험 모드입니다. 저장 내용은 이 브라우저에만 보관되며 이용객 화면의 status.json은 바뀌지 않습니다."
    : "실제 API 서버 연결 모드입니다.";
  loadAll();
}

async function login() {
  const id = $("#adminId").value.trim();
  const password = $("#adminPassword").value;

  if (CONFIG.mockMode) {
    if (id === CONFIG.mockAdmin.id && password === CONFIG.mockAdmin.password) {
      sessionStorage.setItem(SESSION_KEY, "1");
      $("#adminNameInput").value = CONFIG.mockAdmin.name || "";
      showManager();
      return;
    }
    setMessage("#loginMessage", "아이디 또는 비밀번호가 맞지 않습니다.", true);
    return;
  }

  const response = await fetch(`${CONFIG.apiBaseUrl}/api/admin/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password })
  });

  if (!response.ok) {
    setMessage("#loginMessage", "로그인에 실패했습니다.", true);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, "1");
  showManager();
}

async function fetchStatus() {
  if (CONFIG.mockMode) {
    const saved = localStorage.getItem(MOCK_STATUS_KEY);
    if (saved) return JSON.parse(saved);

    const response = await fetch(`../data/status.json?t=${Date.now()}`, { cache: "no-store" });
    return response.json();
  }

  const response = await fetch(`${CONFIG.apiBaseUrl}/api/status`, {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) throw new Error("시설 상태를 불러오지 못했습니다.");
  return response.json();
}

async function fetchHistory() {
  if (CONFIG.mockMode) {
    try {
      return JSON.parse(localStorage.getItem(MOCK_HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  const response = await fetch(`${CONFIG.apiBaseUrl}/api/history`, {
    credentials: "include",
    cache: "no-store"
  });
  if (!response.ok) throw new Error("변경이력을 불러오지 못했습니다.");
  return response.json();
}

async function loadAll() {
  try {
    const [status, history] = await Promise.all([fetchStatus(), fetchHistory()]);
    currentPayload = status;
    renderFacilityOptions();
    renderHistory(history);
  } catch (error) {
    console.error(error);
    setMessage("#saveMessage", error.message, true);
  }
}

function renderFacilityOptions() {
  $("#facilitySelect").innerHTML = currentPayload.facilities
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
    .join("");

  const queryId = new URLSearchParams(location.search).get("facility");
  const exists = currentPayload.facilities.some((item) => item.id === queryId);
  $("#facilitySelect").value = exists ? queryId : currentPayload.facilities[0]?.id || "";
  fillForm();
}

function fillForm() {
  selectedFacility = currentPayload.facilities.find(
    (item) => item.id === $("#facilitySelect").value
  );
  if (!selectedFacility) return;

  const radio = document.querySelector(`input[name="status"][value="${selectedFacility.status}"]`);
  if (radio) radio.checked = true;

  const fixedReasons = [...$("#reasonSelect").options].map((option) => option.value);
  if (fixedReasons.includes(selectedFacility.reason || "")) {
    $("#reasonSelect").value = selectedFacility.reason || "";
    $("#customReason").value = "";
  } else {
    $("#reasonSelect").value = selectedFacility.reason ? "기타" : "";
    $("#customReason").value = selectedFacility.reason || "";
  }

  $("#hoursInput").value = selectedFacility.hours || "";
  $("#closedDayInput").value = selectedFacility.closedDay || "";
  if (!$("#adminNameInput").value) {
    $("#adminNameInput").value = CONFIG.mockAdmin?.name || "";
  }
  $("#pushMessage").value = "";
}

function buildUpdate() {
  const status = document.querySelector('input[name="status"]:checked')?.value;
  const selectedReason = $("#reasonSelect").value;
  const reason = selectedReason === "기타"
    ? $("#customReason").value.trim()
    : selectedReason;

  return {
    facilityId: selectedFacility.id,
    status,
    reason: status === "OPEN" ? "" : reason,
    hours: $("#hoursInput").value.trim(),
    closedDay: $("#closedDayInput").value.trim(),
    adminName: $("#adminNameInput").value.trim(),
    sendPush: $("#sendPush").checked,
    pushMessage: $("#pushMessage").value.trim()
  };
}

function createHistory(oldFacility, updated, update) {
  return {
    id: crypto.randomUUID(),
    changedAt: new Date().toISOString(),
    facilityId: oldFacility.id,
    facilityName: oldFacility.name,
    fromStatus: oldFacility.status,
    toStatus: updated.status,
    reason: updated.reason,
    hours: updated.hours,
    closedDay: updated.closedDay,
    adminName: update.adminName || "관리자",
    pushRequested: update.sendPush,
    pushMessage: update.pushMessage
  };
}

async function save() {
  const update = buildUpdate();

  if (!update.status || !update.adminName) {
    setMessage("#saveMessage", "운영상태와 관리자 이름을 입력해 주세요.", true);
    return;
  }

  if (update.status !== "OPEN" && !update.reason) {
    setMessage("#saveMessage", "휴장 또는 휴장예정 사유를 입력해 주세요.", true);
    return;
  }

  const oldFacility = { ...selectedFacility };

  try {
    if (CONFIG.mockMode) {
      Object.assign(selectedFacility, {
        status: update.status,
        reason: update.reason,
        hours: update.hours,
        closedDay: update.closedDay
      });
      currentPayload.updatedAt = new Date().toISOString();

      const history = await fetchHistory();
      history.unshift(createHistory(oldFacility, selectedFacility, update));

      localStorage.setItem(MOCK_STATUS_KEY, JSON.stringify(currentPayload));
      localStorage.setItem(MOCK_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
      renderHistory(history);
      setMessage(
        "#saveMessage",
        update.sendPush
          ? "시험 저장 완료. 실제 푸시는 서버 연결 후 발송됩니다."
          : "시험 저장 완료."
      );
      return;
    }

    const response = await fetch(`${CONFIG.apiBaseUrl}/api/admin/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "저장에 실패했습니다.");

    setMessage("#saveMessage", result.message || "저장되었습니다.");
    await loadAll();
  } catch (error) {
    console.error(error);
    setMessage("#saveMessage", error.message, true);
  }
}

function renderHistory(history) {
  const target = $("#historyList");

  if (!history.length) {
    target.innerHTML = '<div class="empty">변경이력이 없습니다.</div>';
    return;
  }

  target.innerHTML = history.slice(0, 30).map((item) => `
    <article class="history-item">
      <div class="history-top">
        <span>${formatDate(item.changedAt)}</span>
        <span>${escapeHtml(item.adminName || "관리자")}</span>
      </div>
      <div class="history-title">${escapeHtml(item.facilityName)}</div>
      <div class="history-detail">
        ${STATUS_LABELS[item.fromStatus] || item.fromStatus}
        → ${STATUS_LABELS[item.toStatus] || item.toStatus}
        ${item.reason ? ` · ${escapeHtml(item.reason)}` : ""}
        ${item.pushRequested ? " · 푸시 요청" : ""}
      </div>
    </article>
  `).join("");
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("#loginButton").addEventListener("click", login);
$("#adminPassword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") login();
});
$("#logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});
$("#facilitySelect").addEventListener("change", fillForm);
$("#reloadButton").addEventListener("click", loadAll);
$("#saveButton").addEventListener("click", save);

if (isLoggedIn()) showManager();

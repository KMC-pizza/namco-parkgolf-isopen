import {
  onMessage,
  onRegistered,
  onUnregistered,
  register,
  unregister
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";
import {
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { db, ensureAnonymousUser, getSupportedMessaging } from "./firebase-client.js";

const config = window.NAMCO_CONFIG;
const notificationButton = document.querySelector("#notificationButton");
const notificationMessage = document.querySelector("#notificationMessage");
const notificationState = document.querySelector("#notificationState");
const PUSH_ENABLED_KEY = "namco-parkgolf-push-enabled";

let messaging = null;
let currentUser = null;
let registeredFid = null;
let listenersReady = false;

function showMessage(message, isError = false) {
  notificationMessage.textContent = message || "";
  notificationMessage.classList.toggle("is-error", isError);
}

function setUi(enabled) {
  notificationState.textContent = enabled ? "켜짐" : "꺼짐";
  notificationState.classList.toggle("is-on", enabled);
  notificationState.classList.toggle("is-off", !enabled);
  notificationButton.textContent = enabled ? "알림 끄기" : "알림 받기";
  notificationButton.classList.toggle("is-enabled", enabled);
}

function isLocallyEnabled() {
  return localStorage.getItem(PUSH_ENABLED_KEY) === "1";
}

async function saveRegistration(fid) {
  const user = currentUser || await ensureAnonymousUser();
  currentUser = user;
  registeredFid = fid;

  await setDoc(doc(db, "push_subscribers", user.uid), {
    fid,
    enabled: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  localStorage.setItem(PUSH_ENABLED_KEY, "1");
  setUi(true);
  showMessage("운영상황 변경 알림을 받도록 설정되었습니다.");
}

async function markUnregistered(fid) {
  const user = currentUser || await ensureAnonymousUser();
  currentUser = user;

  const ref = doc(db, "push_subscribers", user.uid);
  try {
    await updateDoc(ref, {
      fid: deleteField(),
      enabled: false,
      updatedAt: serverTimestamp()
    });
  } catch {
    await setDoc(ref, {
      enabled: false,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  if (!fid || fid === registeredFid) registeredFid = null;
  localStorage.setItem(PUSH_ENABLED_KEY, "0");
  setUi(false);
}

function setupMessagingListeners() {
  if (!messaging || listenersReady) return;
  listenersReady = true;

  onRegistered(messaging, (fid) => {
    saveRegistration(fid).catch((error) => {
      console.error("FID 저장 실패:", error);
      showMessage("알림 기기 등록정보 저장에 실패했습니다.", true);
    });
  });

  onUnregistered(messaging, (fid) => {
    markUnregistered(fid).catch((error) => {
      console.error("FID 해제 저장 실패:", error);
    });
  });

  onMessage(messaging, async (payload) => {
    const notification = payload.notification || {};
    const data = payload.data || {};
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(
      notification.title || data.title || "남구파크골프장",
      {
        body: notification.body || data.body || "운영상황이 변경되었습니다.",
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",
        data: { url: data.url || config.projectPath }
      }
    );
  });
}

async function getMessagingReady() {
  if (messaging) return messaging;
  messaging = await getSupportedMessaging();
  if (!messaging) throw new Error("이 브라우저는 웹 푸시알림을 지원하지 않습니다.");
  setupMessagingListeners();
  return messaging;
}

async function enableNotifications() {
  notificationButton.disabled = true;
  showMessage("알림을 설정하는 중입니다.");

  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      throw new Error("이 브라우저는 웹 푸시알림을 지원하지 않습니다.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      localStorage.setItem(PUSH_ENABLED_KEY, "0");
      setUi(false);
      throw new Error(
        permission === "denied"
          ? "브라우저에서 알림이 차단되어 있습니다. 사이트 설정에서 알림을 허용해 주세요."
          : "알림 권한이 허용되지 않았습니다."
      );
    }

    currentUser = await ensureAnonymousUser();
    const activeMessaging = await getMessagingReady();
    const swRegistration = await navigator.serviceWorker.ready;

    await register(activeMessaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: swRegistration
    });

    // 실제 FID 저장은 onRegistered 콜백에서 수행됩니다.
    showMessage("알림 기기를 등록하고 있습니다.");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "알림 설정 중 오류가 발생했습니다.", true);
  } finally {
    notificationButton.disabled = false;
  }
}

async function disableNotifications() {
  notificationButton.disabled = true;
  showMessage("알림을 해제하는 중입니다.");

  try {
    currentUser = await ensureAnonymousUser();
    const activeMessaging = await getMessagingReady();
    await unregister(activeMessaging);

    // 일부 환경에서 콜백이 지연될 수 있어 UI/DB 상태를 한 번 더 보정합니다.
    await markUnregistered(registeredFid);
    showMessage("이 기기의 운영상황 알림을 껐습니다.");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "알림 해제 중 오류가 발생했습니다.", true);
  } finally {
    notificationButton.disabled = false;
  }
}

async function initializePushUi() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    setUi(false);
    notificationButton.disabled = true;
    showMessage("이 브라우저는 웹 푸시알림을 지원하지 않습니다.", true);
    return;
  }

  if (Notification.permission === "denied") {
    localStorage.setItem(PUSH_ENABLED_KEY, "0");
    setUi(false);
    showMessage("브라우저에서 알림이 차단되어 있습니다.", true);
    return;
  }

  const enabled = Notification.permission === "granted" && isLocallyEnabled();
  setUi(enabled);

  // 사용자가 이미 이 앱에서 알림을 켠 상태라면 FID 변경/갱신을 자동 동기화합니다.
  if (enabled) {
    try {
      currentUser = await ensureAnonymousUser();
      const activeMessaging = await getMessagingReady();
      const swRegistration = await navigator.serviceWorker.ready;
      await register(activeMessaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: swRegistration
      });
    } catch (error) {
      console.error("알림 등록 갱신 실패:", error);
      showMessage("알림 등록상태를 확인하지 못했습니다.", true);
    }
  }
}

notificationButton.addEventListener("click", () => {
  if (isLocallyEnabled() && Notification.permission === "granted") {
    disableNotifications();
  } else {
    enableNotifications();
  }
});

initializePushUi();

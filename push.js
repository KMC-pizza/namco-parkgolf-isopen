const notificationButton = document.querySelector("#notificationButton");
const notificationMessage = document.querySelector("#notificationMessage");
const config = window.NAMCO_CONFIG ?? {};

function getInterests() {
  try {
    const value = JSON.parse(localStorage.getItem("namgu-facility-interests"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function showMessage(message) {
  if (notificationMessage) notificationMessage.textContent = message;
}

async function registerTokenAtServer(token, interests) {
  if (config.mockMode) {
    localStorage.setItem("namco-mock-fcm-token", token);
    localStorage.setItem("namco-mock-fcm-interests", JSON.stringify(interests));
    return;
  }

  if (!config.apiBaseUrl) {
    throw new Error("API 서버 주소가 설정되지 않았습니다.");
  }

  const response = await fetch(`${config.apiBaseUrl}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, interests })
  });

  if (!response.ok) {
    throw new Error("알림 구독 저장에 실패했습니다.");
  }
}

async function enableNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    showMessage("이 브라우저는 웹 푸시를 지원하지 않습니다.");
    return;
  }

  const interests = getInterests();
  if (interests.length === 0) {
    showMessage("먼저 시설 카드의 별표를 선택해 주세요.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    showMessage("알림 권한이 허용되지 않았습니다.");
    return;
  }

  // Firebase 설정 전에는 화면 흐름만 시험
  const firebaseReady =
    config.firebase?.apiKey &&
    config.firebase?.projectId &&
    config.firebase?.messagingSenderId &&
    config.firebase?.appId &&
    config.vapidKey;

  if (!firebaseReady) {
    if (config.mockMode) {
      await registerTokenAtServer(`mock-${crypto.randomUUID()}`, interests);
      showMessage("테스트 모드로 관심시설 알림이 등록되었습니다.");
    } else {
      showMessage("FCM 설정값이 아직 입력되지 않았습니다.");
    }
    return;
  }

  try {
    const [{ initializeApp }, { getMessaging, getToken }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js")
    ]);

    const app = initializeApp(config.firebase);
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error("FCM 토큰을 발급받지 못했습니다.");
    }

    await registerTokenAtServer(token, interests);
    showMessage("관심시설 알림이 등록되었습니다.");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "알림 등록 중 오류가 발생했습니다.");
  }
}

if (notificationButton) {
  notificationButton.addEventListener("click", enableNotifications);

  if (Notification.permission === "granted") {
    notificationButton.textContent = "알림 설정 갱신";
  }
}

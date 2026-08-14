importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDIxWquVpyD966Ur8GojY-QwENh3aByfqU",
  authDomain: "namco-parkgolf-isopen.firebaseapp.com",
  projectId: "namco-parkgolf-isopen",
  storageBucket: "namco-parkgolf-isopen.firebasestorage.app",
  messagingSenderId: "619415491274",
  appId: "1:619415491274:web:7f4328c7366837b253da33"
});

firebase.messaging();

// v36 90차: 새 배포를 확실히 구분하기 위한 캐시 버전
const CACHE_NAME = "namco-parkgolf-isopen-pwa-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=90",
  "./config.js?v=90",
  "./firebase-client.js",
  "./app.js?v=90",
  "./push.js?v=90",
  "./manifest.json",
  "./data/status.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.includes("/data/status.json")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML/JS/CSS 및 앱 진입은 최신 배포를 우선 확인
  const networkFirst =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/");

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

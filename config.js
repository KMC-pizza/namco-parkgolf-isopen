window.NAMCO_CONFIG = {
  // GitHub Pages에서 화면만 시험할 때 true
  // 실제 API 서버를 연결한 뒤 false로 변경
  mockMode: true,

  // 실제 서버 주소 예: "https://알림서버.example.kr"
  apiBaseUrl: "",

  // FCM 웹 설정값. Firebase Console의 '웹 앱 추가' 후 공개 설정값을 입력
  // 이 값은 웹 클라이언트 식별값이며 서비스 계정 비밀키가 아님
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // Firebase Console > Cloud Messaging > 웹 푸시 인증서의 공개 VAPID 키
  vapidKey: "",

  // 관리자 페이지의 임시 로컬 테스트용
  // 실제 운영에서는 반드시 서버 로그인으로 교체
  mockAdmin: {
    id: "admin",
    password: "1234",
    name: "김민철"
  }
};

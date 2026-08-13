# namco-parkgolf-isopen

남구파크골프장 운영상태 확인 및 푸시알림 PWA입니다.

## 현재 구조

- GitHub Pages: 이용객 PWA 배포
- Firebase Firestore: 운영상태 및 알림 기기 FID 저장
- Firebase Authentication: 이용객 기기를 익명 인증으로 구분
- Firebase Cloud Messaging: 휴장·운영재개 등 푸시알림
- FMS(추후): Firestore 상태 갱신 + FCM 푸시 발송

공단 내부 FMS는 외부에서 접속받지 않고 Firebase로 HTTPS 아웃바운드 통신만 사용하도록 설계합니다.

## GitHub 저장소

권장 저장소명: `namco-parkgolf-isopen`

GitHub Pages 주소 예시:

`https://kmc-pizza.github.io/namco-parkgolf-isopen/`

## 배포

이 폴더의 파일들을 저장소 최상위에 업로드한 뒤 GitHub Pages를 활성화합니다.

PWA 경로는 아래 값으로 이미 변경되어 있습니다.

- `start_url`: `/namco-parkgolf-isopen/`
- `scope`: `/namco-parkgolf-isopen/`
- 서비스워커 캐시명: `namco-parkgolf-isopen-pwa-v1`

## Firebase

Firebase 프로젝트: `namco-parkgolf-isopen`

Firebase 공개 웹 설정과 VAPID 공개키는 `config.js` 및 서비스워커에 반영되어 있습니다.
이 값들은 웹 클라이언트용 공개 식별값입니다.

서비스 계정 JSON 개인키는 이 저장소에 넣지 않습니다.

Firebase Console에서 추가로 해야 할 일은 `FIREBASE_SETUP.md`를 참고하세요.

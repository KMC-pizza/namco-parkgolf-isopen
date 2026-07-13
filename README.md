# 남구시설 알리미 전체 기능 시제품

## 지금 바로 가능한 기능

- 이용객 시설 상태 조회
- 별표 관심시설 저장
- 알림 권한 요청 화면
- `/admin/` 관리자 페이지
- 운영 / 휴장 / 휴장예정 변경
- 휴장 사유, 운영시간, 휴장일 입력
- 변경이력 표시
- 시험 모드에서 브라우저 LocalStorage 저장
- 실제 API 서버 연결용 코드
- FCM 토큰 등록 및 서버 푸시 발송용 코드

## 반드시 알아둘 점

GitHub Pages에서는 파일을 서버처럼 수정할 수 없습니다.

현재 `config.js`의 `mockMode: true` 상태에서는 관리자 저장 내용이
관리자 본인의 브라우저에만 저장됩니다. 일반 이용객 화면에는 반영되지 않습니다.

실제 운영하려면 `server/` 폴더의 서버를 공단 서버 등에 올린 뒤:

1. `config.js`의 `mockMode`를 `false`로 변경
2. `apiBaseUrl`에 실제 서버 HTTPS 주소 입력
3. 이용객 `app.js`의 상태 조회 주소를 API 주소로 전환
4. FCM 공개 설정값과 VAPID 공개키 입력
5. 서버에는 서비스 계정 파일을 GitHub 밖에 보관

## GitHub 업로드

압축을 푼 다음 저장소 `namco-alarmi` 첫 화면에서:

1. `Add file`
2. `Upload files`
3. 이 압축 안의 파일과 폴더를 모두 드래그
4. 같은 이름 파일은 덮어쓰기
5. 아래 `Commit changes` 클릭

폴더 구조가 유지되어야 합니다.

- `admin/index.html`
- `data/status.json`
- `server/app.py`

`server/` 폴더는 GitHub Pages에서 실행되지 않으며, 나중에 별도 서버에 배포할 참고 코드입니다.

## 관리자 시험 로그인

- 주소: `https://kmc-pizza.github.io/namco-alarmi/admin/`
- 아이디: `admin`
- 비밀번호: `1234`

이 값은 공개 코드에 있으므로 실제 보안 로그인으로 사용할 수 없습니다.
실제 서버 연결 전 화면 시험용입니다.

## 실제 FCM 준비값

`config.js`에 Firebase 웹 앱 공개 설정값과 VAPID 공개키만 입력합니다.
서비스 계정 JSON 파일은 절대로 GitHub에 업로드하지 않습니다.

푸시 발송은 `server/app.py`가 Firebase Admin SDK로 수행합니다.

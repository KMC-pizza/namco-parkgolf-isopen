# Firebase 최초 설정

이 프로젝트는 GitHub Pages의 정적 PWA이며, 외부에서 공단 내부 FMS로 접속하지 않습니다.
이용객 PWA는 Firebase를 이용하고, 추후 FMS가 Firebase로 HTTPS 아웃바운드 통신만 수행합니다.

## 1. Firestore 보안 규칙 적용

Firebase Console → Firestore Database → 규칙에서 이 프로젝트의 `firestore.rules` 내용을 붙여넣고 게시합니다.

- `facilities/*` : 누구나 조회 가능, 웹 이용자는 수정 불가
- `push_subscribers/{uid}` : 익명 인증된 본인 문서만 읽기/쓰기 가능
- FMS의 Firebase Admin SDK는 서버 권한으로 위 규칙과 별도로 접근합니다.

## 2. Authentication 승인 도메인 확인

Firebase Console → Authentication → 설정 → 승인된 도메인에서 GitHub Pages 도메인을 확인합니다.

현재 GitHub 계정 기준:

`kmc-pizza.github.io`

없으면 추가합니다. URL 전체 경로가 아니라 도메인만 입력합니다.

## 3. 운영상태 문서 만들기

FMS 연동 전 시험하려면 Firestore에서 아래 문서를 1개 생성합니다.

컬렉션: `facilities`
문서 ID: `park-golf`

필드 예시:

- `name` (string): `남구파크골프장`
- `status` (string): `OPEN`
- `reason` (string): ``
- `notice` (string): ``
- `hours` (string): `07:00 ~ 19:00`
- `closedDay` (string): `매주 월요일`
- `updatedAt` (timestamp): 현재 시각

상태값은 현재 다음 값을 사용합니다.

- `OPEN` : 운영중
- `CLOSED` : 휴장
- `SCHEDULED_CLOSE` : 휴장예정
- `TEMPORARY_CLOSED` : 임시 운영중단

Firestore 문서가 아직 없거나 조회에 실패하면 `data/status.json`을 임시 상태로 표시합니다.

## 4. 푸시 등록 확인

GitHub Pages를 휴대폰 브라우저에서 열고 `알림 받기`를 누릅니다.
알림 권한을 허용하면 Firebase 익명 인증 후 FCM Firebase Installation ID(FID)가 등록됩니다.

Firestore에 아래 문서가 자동 생성되는지 확인합니다.

컬렉션: `push_subscribers`
문서 ID: Firebase 익명 Auth UID

필드:

- `fid` : FCM 전송 대상 Firebase Installation ID
- `enabled` : `true`
- `updatedAt` : 서버 타임스탬프

`알림 끄기`를 누르면 FCM 등록을 해제하고 `enabled`가 `false`로 변경됩니다.

## 5. 향후 FMS 연동

FMS는 Firebase Admin SDK를 사용해 다음 두 작업만 수행하면 됩니다.

1. `facilities/park-golf` 문서의 운영상태 갱신
2. `push_subscribers` 중 `enabled == true`인 FID를 읽어 FCM 푸시 발송

공단 내부망으로 들어오는 외부 인바운드 연결은 필요하지 않습니다.
서비스 계정 JSON 개인키는 절대로 GitHub에 업로드하지 않습니다.

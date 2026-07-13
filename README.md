# 남구시설 알리미 PWA 프로토타입

GitHub Pages에 바로 배포할 수 있는 정적 PWA입니다.

## 포함 기능
- 시설 3곳 운영상태 표시
- 운영 / 휴장 / 휴장예정 상태
- 운영시간 및 휴장일 표시
- 관심시설 선택값 LocalStorage 저장
- Android 설치 프롬프트
- PWA manifest 및 service worker
- 오프라인 앱 셸 캐시
- JSON 기반 운영상태 데이터

## 아직 포함하지 않은 기능
- 관리자 화면
- 상태 변경 API
- 변경이력
- 웹 푸시 구독 및 발송
- iPhone 설치 안내 화면

## GitHub Pages 배포
1. 새 공개 저장소를 만듭니다.
2. 이 폴더 안의 파일 전체를 저장소 최상위에 업로드합니다.
3. Settings → Pages로 이동합니다.
4. Deploy from a branch를 선택합니다.
5. Branch를 main / root로 설정합니다.
6. 제공된 github.io 주소로 접속합니다.

## 상태 수정
`data/status.json` 파일을 수정하면 화면에 반영됩니다.

상태 코드:
- `OPEN`: 운영
- `CLOSED`: 휴장
- `SCHEDULED_CLOSE`: 휴장예정

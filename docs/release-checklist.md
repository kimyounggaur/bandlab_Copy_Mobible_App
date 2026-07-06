# Release Checklist

- PWA manifest 이름, 테마색, standalone 설정 확인.
- 홈 화면 설치 후 safe-area와 하단 홈바 가림 없음 확인.
- iOS 무음 스위치 안내 문구 확인.
- Wake Lock API 적용 범위 점검.
- 마이크 권한 설명 문구 점검.
- 오프라인 상태에서 앱 셸과 번들 WAV 로딩 확인.
- Lighthouse PWA 설치 가능 판정 확인.
- 실기기 iOS Safari 16+에서 재생/녹음/복귀 점검.
- Android Chrome 최신에서 재생/녹음/복귀 점검.
- 상용 샘플이 포함되지 않았는지 `public/loops` 출처 확인.

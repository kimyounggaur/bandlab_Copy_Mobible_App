# LoopPocket

입문자가 앱을 연 지 30초 안에 첫 소리를 듣고, 3분 안에 8마디 비트를 만들 수 있게 설계한 모바일 웹 DAW입니다.

## 실행

```bash
npm install
npm run generate:loops
npm run dev -- --host
```

폰에서 같은 와이파이에 접속한 뒤 Vite가 표시하는 네트워크 주소로 접속합니다.
`generate:loops`는 44.1kHz WAV와 FLAC을 함께 만듭니다. `npm install`에 포함된 `ffmpeg-static`을 사용하며, 별도 ffmpeg를 쓰려면 `FFMPEG_PATH`를 설정하세요. ffmpeg를 사용할 수 없으면 WAV만 생성됩니다.

## 개발 점검 페이지

- `/dev/tokens`: 디자인 토큰 확인
- `/dev/audio`: Tone.js 엔진, 메트로놈, WAV/FLAC 샘플 정렬 점검

## 포함된 범위

- React 18 + TypeScript + Vite PWA
- Tailwind 디자인 토큰
- Tone.js Transport 기반 재생/메트로놈
- 최대 8트랙 프로젝트 모델, 50단계 undo/redo
- 루프 라이브러리, 타임라인, 악기 패드, 믹서, 원노브 이펙트
- IndexedDB 자동저장과 실제 오프라인 렌더 기반 WAV 내보내기
- 소리별 템포 변환(음정 악기는 그레인, 드럼은 슬라이스)과 실시간 미터
- FLAC 우선/WAV 폴백. PWA 설치 시 스타터 루프 6개만 사전 캐시하고 나머지는 필요할 때 받음

## 알려진 한계

- 루프는 합성 CC0 에셋입니다. 오프라인에서는 미리 받은 루프와 스타터 루프만 사용할 수 있습니다.
- iOS Safari/Android Chrome의 FLAC 샘플 정렬, 저사양 기기의 8트랙 성능과 마이크 지연은 실기기 검증이 필요합니다.
- 네이티브 저지연 마이크 모니터링은 브라우저와 기기 제약을 받습니다.

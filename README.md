# LoopPocket

입문자가 앱을 연 지 30초 안에 첫 소리를 듣고, 3분 안에 8마디 비트를 만들 수 있게 설계한 모바일 웹 DAW입니다.

## 실행

```bash
npm install
npm run generate:loops
npm run dev -- --host
```

폰에서 같은 와이파이에 접속한 뒤 Vite가 표시하는 네트워크 주소로 접속합니다.

## 개발 점검 페이지

- `/dev/tokens`: 디자인 토큰 확인
- `/dev/audio`: Tone.js 엔진과 메트로놈 점검

## 포함된 범위

- React 18 + TypeScript + Vite PWA
- Tailwind 디자인 토큰
- Tone.js Transport 기반 재생/메트로놈
- 최대 8트랙 프로젝트 모델, 20단계 undo/redo
- 루프 라이브러리, 타임라인, 악기 패드, 믹서, 원노브 이펙트
- IndexedDB 자동저장과 WAV 내보내기

## 알려진 한계

- 번들 루프는 개발용 합성 CC0 스타일 에셋입니다.
- 고품질 타임스트레치와 네이티브 저지연 모니터링은 v2 범위입니다.
- 내보내기는 MVP용 브라우저 렌더 경로이며, 정밀 오프라인 바운스는 후속 개선 대상입니다.

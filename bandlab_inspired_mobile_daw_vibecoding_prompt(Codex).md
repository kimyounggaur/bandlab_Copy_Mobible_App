# BandLab 기반 모바일 DAW 앱 개발용 바이브코딩 프롬프트 설계서

> 목적: BandLab의 **빠른 창작 진입**, **초보 친화적 Studio 흐름**, **모바일 중심 녹음/비트/믹스 UX**에서 배울 점을 참고해, 완전히 독자적인 모바일 DAW 앱을 단계적으로 구현하기 위한 AI 코딩 에이전트용 프롬프트 모음입니다.  
> 원칙: BandLab의 브랜드, 로고, 색상 체계, 화면 배치, 문구, 아이콘, 사운드 라이브러리, 명칭을 복제하지 않습니다. 아래 프롬프트는 “사용자 경험 패턴”을 참고할 뿐, UI/UX와 코드/에셋은 독자적으로 설계합니다.

---

## 0. 바로 쓰는 방법

이 문서는 Cursor, Claude Code, Windsurf, Lovable, Bolt, Replit Agent 같은 바이브코딩 도구에 단계적으로 붙여 넣어 쓰도록 설계되어 있습니다.

권장 사용 순서:

1. `1. 전체 마스터 프롬프트`를 먼저 붙여 넣습니다.
2. 앱 이름, 색상, 타깃 사용자, 기술 스택을 정했다면 `2. 프로젝트 전제값`만 수정합니다.
3. `6. 단계별 구현 프롬프트`를 Phase 0부터 순서대로 실행합니다.
4. 각 Phase가 끝날 때마다 `완료 기준`을 체크하고 다음 Phase로 넘어갑니다.
5. UI가 마음에 들지 않으면 `7. UX 리파인먼트 프롬프트`만 반복 실행합니다.
6. 기능이 불안정하면 `8. QA/성능/리팩터링 프롬프트`를 실행합니다.

---

## 1. 전체 마스터 프롬프트

아래 블록을 새 프로젝트의 AI 코딩 에이전트 첫 메시지로 붙여 넣으세요.

```text
너는 모바일 음악 제작 앱을 설계하고 구현하는 시니어 프로덕트 디자이너, React Native/Expo 개발자, 모바일 오디오 엔지니어, 접근성 전문가다.

우리는 BandLab의 장점인 “빠른 창작 시작”, “모바일 DAW 안에서 보컬 녹음·비트 만들기·데모 믹스·협업까지 이어지는 흐름”, “초보자가 겁먹지 않는 Studio UX”에서 영감을 얻어 완전히 독자적인 모바일 DAW 앱을 만든다.

중요한 법적/윤리적 제약:
- BandLab이라는 이름, 로고, 색상, 화면 구성, 아이콘, 텍스트, 사운드, 샘플, 브랜드 표현을 복제하지 마라.
- 경쟁 앱의 화면을 그대로 따라 하지 말고, 사용자의 과업 흐름과 UX 원칙만 참고해 새 디자인 시스템을 만들어라.
- 앱 이름은 임시로 “PocketStudio”라고 부르되, 코드에서는 appName 상수로 분리해 나중에 쉽게 변경 가능하게 하라.

핵심 제품 목표:
- 사용자가 앱 설치 후 10초 안에 첫 녹음 버튼을 발견한다.
- 사용자가 30초 안에 첫 보컬/비트/루프 중 하나를 프로젝트에 추가한다.
- 사용자가 3분 안에 2트랙 이상의 짧은 데모를 재생하고 저장한다.
- 초보자는 복잡한 DAW 용어를 몰라도 진행할 수 있고, 숙련자는 점진적으로 고급 기능을 열 수 있다.

타깃 사용자:
- 모바일로 보컬 데모를 빠르게 녹음하고 싶은 싱어송라이터
- 힙합/EDM/팝 비트를 스케치하려는 초보 프로듀서
- 노트북 없이 폰으로 아이디어를 저장하려는 크리에이터
- 복잡한 DAW보다 직관적인 멀티트랙 편집을 원하는 입문자

기술 방향:
- 기본 앱: Expo + React Native + TypeScript
- 라우팅: expo-router
- 상태관리: Zustand
- 로컬 저장: SQLite 또는 WatermelonDB 계층화
- 오디오 MVP: expo-audio 기반 녹음/재생, 내부 AudioEngineService 추상화
- 프로덕션 오디오 엔진 확장: iOS AudioKit/AVAudioEngine, Android Oboe/AAudio/OpenSL ES 계열 네이티브 모듈을 JSI/TurboModule로 연결 가능한 구조
- 클라우드/협업 v1 이후: Supabase Auth, Postgres, Storage, Realtime
- 디자인: 모바일 우선, 큰 터치 타깃, 하단 시트 중심, 복잡한 기능은 progressive disclosure

앱의 핵심 화면:
1. OnboardingScreen: 3단계 이하의 간단한 온보딩과 마이크 권한 안내
2. HomeScreen: 최근 프로젝트, 큰 “새로 만들기” 버튼, 빠른 시작 카드
3. CreateProjectSheet: 보컬 녹음, 비트 만들기, 루프 추가, 오디오 가져오기, 빈 프로젝트
4. StudioScreen: 멀티트랙 타임라인, 트랙 헤더, 클립, 재생헤드, 하단 Transport Bar, Add Track Sheet
5. RecordScreen 또는 RecordBottomSheet: 카운트인, 메트로놈, 입력 레벨, 재녹음/사용하기
6. MixerSheet: 트랙별 볼륨, 팬, mute, solo, 간단 프리셋
7. EffectsSheet: 보컬/기타/드럼/마스터 프리셋을 한 탭으로 적용
8. LoopsScreen: 장르/무드/BPM 필터, 루프 미리듣기, 프로젝트에 추가
9. ExportSheet: 빠른 마스터, 파일명, 포맷, 공유
10. SettingsScreen: 오디오 설정, 권한, 저장공간, 접근성

UX 원칙:
- Record-first: 첫 화면에서 “녹음”과 “비트 만들기”를 숨기지 않는다.
- One obvious next action: 각 화면에는 가장 중요한 CTA 하나가 분명해야 한다.
- Progressive disclosure: 초보자에게는 쉬운 카드/프리셋, 고급 사용자는 펼치기/상세 설정.
- Always recoverable: 실행 취소, 자동저장, 삭제 취소 snackbar, take 보관.
- Mobile ergonomics: 엄지손가락 영역에 Transport, Add, Record를 배치한다.
- Friendly language: “오디오 트랙 추가”보다 “목소리 녹음하기”, “컴프레서”보다 “소리 더 단단하게” 같은 설명을 병행한다.
- Offline-first: 창작은 네트워크 없이 가능해야 한다.
- Trust: 마이크 권한, 파일 업로드, 클라우드 동기화는 명확히 설명하고 사용자가 선택하게 한다.

개발 방식:
- 한 번에 전체 앱을 완성하려 하지 말고 작은 Phase로 나누어 구현한다.
- 각 Phase마다 실제 동작하는 화면, 타입, 상태, 테스트 또는 수동 검증 체크리스트를 남긴다.
- 오디오 기능은 반드시 AudioEngineService 인터페이스 뒤에 숨긴다. 초기에는 mock 또는 expo-audio 구현이어도 된다.
- UI 컴포넌트는 재사용 가능하게 만든다.
- 접근성 label, hitSlop, 44px 이상의 터치 영역, 다크모드를 고려한다.
- 매 Phase 종료 시 변경한 파일 목록, 실행 방법, 남은 리스크를 요약한다.

지금부터 Phase 0부터 구현을 시작하라. 내가 별도 지시하지 않는 한, iOS/Android 공통 모바일 앱 기준으로 진행하라.
```

---

## 2. 프로젝트 전제값

프로젝트 시작 전에 아래 값을 원하는 방향으로 바꾸세요.

```text
앱 이름: PocketStudio
주요 언어: 한국어 우선, 영어 확장 가능
플랫폼: iOS + Android
MVP 트랙 수: 최대 8트랙
MVP 오디오 기능: 녹음, 가져오기, 클립 배치, 재생, 볼륨/팬, mute/solo, 간단 export mock
MVP 비트 기능: 16-step drum grid, 기본 킷 1개, BPM 조절
MVP 협업 기능: 제외. v1에서 클라우드 저장/초대 링크 추가
MVP AI 기능: 실제 AI 제외. “스마트 제안” UI와 mock 결과만 구현
타깃 해상도: 360x800 Android 소형 화면부터 iPhone Pro Max까지
디자인 방향: 어두운 Studio, 밝고 친근한 Home, 고대비 CTA
금지사항: BandLab UI 복제, BandLab 명칭/아이콘/색상/문구 차용, 저작권 샘플 포함
```

---

## 3. BandLab에서 참고할 UX 패턴 요약

아래 내용은 “무엇을 배울지”를 정리한 것이며 “무엇을 베낄지”가 아닙니다.

| 참고 패턴 | 우리 앱에서 재해석할 방식 |
|---|---|
| 모바일 DAW 안에서 보컬 녹음, 비트 제작, 데모 믹스까지 한 흐름으로 연결 | 첫 화면의 빠른 시작 카드: `목소리 녹음`, `비트 만들기`, `루프 추가`, `가져오기` |
| 프로젝트를 웹/모바일에서 이어갈 수 있는 창작 플랫폼 지향 | MVP는 오프라인 우선, v1에서 계정 기반 클라우드 동기화 |
| Studio 안의 Automation, Voice Cleaner, 오디오 프리셋 등 초보 친화 기능 | `스마트 정리`, `보컬 선명하게`, `공간감 추가` 같은 쉬운 설명 + 고급 설정 펼치기 |
| 볼륨, 팬, EQ, compression, effects 등 기본 믹싱 요소 | 초보용 Mixer에서는 볼륨/팬/프리셋 먼저, EQ/Comp는 Advanced 탭 |
| 모바일 Automation으로 볼륨, 팬, 이펙트 변화를 점으로 조절 | v1에서 `움직임 그리기`라는 친근한 자동화 편집 UX |
| 기기 성능 부족 시 트랙 Freeze로 처리 부담 감소 | v1에서 `트랙 가볍게 만들기` 버튼으로 렌더/프리즈 기능 제공 |
| AutoMix처럼 장르 선택 기반 빠른 믹스 | MVP에서는 mock, v1에서 `빠른 밸런스` 기능으로 확장 |

---

## 4. 제품 구조

### 4.1 핵심 사용자 여정

```text
앱 실행
→ HomeScreen
→ 큰 “새로 만들기” 버튼
→ CreateProjectSheet
→ 사용자가 하나 선택
   A. 목소리 녹음하기
   B. 비트 만들기
   C. 루프 추가하기
   D. 오디오 가져오기
   E. 빈 프로젝트
→ StudioScreen 진입
→ 자동저장
→ 재생/편집/믹스
→ ExportSheet
→ 기기에 저장 또는 공유
```

### 4.2 정보 구조

```text
Root
├─ Onboarding
├─ Home
│  ├─ Recent Projects
│  ├─ Quick Start Cards
│  └─ Tips
├─ Studio /projects/:id
│  ├─ Timeline
│  ├─ Track Headers
│  ├─ Transport Bar
│  ├─ Add Track Sheet
│  ├─ Mixer Sheet
│  ├─ Effects Sheet
│  ├─ Loops Sheet
│  └─ Export Sheet
├─ Library
│  ├─ Loops
│  ├─ Samples
│  └─ Imported Files
└─ Settings
   ├─ Audio
   ├─ Storage
   ├─ Accessibility
   └─ Account, v1
```

### 4.3 MVP 기능 범위

```text
반드시 구현:
- 프로젝트 생성/목록/삭제/이름 변경
- 8트랙 이하의 멀티트랙 타임라인 UI
- 오디오 트랙 생성
- 마이크 녹음 후 클립으로 추가
- mock waveform 또는 실제 waveform placeholder
- 클립 선택, 이동, 자르기 UI
- 재생/정지/녹음 transport
- 트랙 mute/solo/volume/pan 상태
- 루프 라이브러리 mock 데이터와 미리듣기 UI
- 드럼 16-step grid mock 또는 간단 WebAudio/오디오 파일 기반 재생 구조
- 효과 프리셋 UI와 track.effects 상태 저장
- export sheet와 mock export 완료 흐름
- 자동저장 표시
- 접근성 label과 큰 터치 영역

MVP에서 제외해도 됨:
- 완전한 저지연 오디오 믹싱 엔진
- 실시간 플러그인 체인
- 실제 AI 마스터링
- 실시간 협업
- 유료 결제
- 소셜 피드
```

---

## 5. 추천 폴더 구조

```text
src/
├─ app/
│  ├─ _layout.tsx
│  ├─ index.tsx
│  ├─ onboarding.tsx
│  ├─ settings.tsx
│  └─ projects/
│     └─ [id].tsx
├─ components/
│  ├─ ui/
│  │  ├─ AppButton.tsx
│  │  ├─ AppCard.tsx
│  │  ├─ BottomSheet.tsx
│  │  ├─ IconButton.tsx
│  │  ├─ Meter.tsx
│  │  └─ Waveform.tsx
│  ├─ home/
│  │  ├─ QuickStartCard.tsx
│  │  └─ RecentProjectCard.tsx
│  └─ studio/
│     ├─ StudioHeader.tsx
│     ├─ Timeline.tsx
│     ├─ TrackLane.tsx
│     ├─ TrackHeader.tsx
│     ├─ ClipBlock.tsx
│     ├─ TransportBar.tsx
│     ├─ MixerSheet.tsx
│     ├─ EffectsSheet.tsx
│     ├─ AddTrackSheet.tsx
│     ├─ LoopsSheet.tsx
│     └─ ExportSheet.tsx
├─ features/
│  ├─ audio/
│  │  ├─ AudioEngineService.ts
│  │  ├─ ExpoAudioEngineService.ts
│  │  ├─ MockAudioEngineService.ts
│  │  └─ audioTypes.ts
│  ├─ projects/
│  │  ├─ projectTypes.ts
│  │  ├─ projectStore.ts
│  │  ├─ projectRepository.ts
│  │  └─ projectFixtures.ts
│  ├─ loops/
│  │  ├─ loopTypes.ts
│  │  └─ loopFixtures.ts
│  └─ drums/
│     ├─ drumTypes.ts
│     └─ drumStore.ts
├─ design/
│  ├─ tokens.ts
│  ├─ spacing.ts
│  └─ typography.ts
├─ utils/
│  ├─ time.ts
│  ├─ ids.ts
│  └─ accessibility.ts
└─ tests/
   ├─ projectStore.test.ts
   └─ audioEngineService.test.ts
```

---

## 6. 단계별 구현 프롬프트

각 Phase는 그대로 붙여 넣어도 되도록 작성되어 있습니다.

---

### Phase 0. 프로젝트 스캐폴딩

```text
Phase 0을 구현해줘.

목표:
- Expo + React Native + TypeScript 기반 앱 골격을 만든다.
- expo-router를 사용한다.
- src 중심 폴더 구조를 만든다.
- ESLint/Prettier/TypeScript strict 설정을 준비한다.
- 앱 이름은 PocketStudio로 하되 app config와 constants에서 분리한다.

구현 요구:
1. package.json 스크립트를 정리해라: start, ios, android, test, lint, typecheck.
2. src/app/_layout.tsx, src/app/index.tsx를 만든다.
3. HomeScreen placeholder를 만들고 “PocketStudio”, “새 프로젝트 만들기”, “최근 프로젝트 없음”을 보여준다.
4. design/tokens.ts에 색상, spacing, radius, typography token을 만든다.
5. components/ui/AppButton.tsx와 AppCard.tsx를 만든다.
6. 모든 버튼에는 accessibilityRole과 accessibilityLabel을 넣는다.
7. README에 실행 방법을 적는다.

완료 기준:
- npm run typecheck 통과
- npm run lint 통과
- 앱 첫 화면이 깨지지 않음
- UI 코드는 하드코딩 색상보다 token을 우선 사용

주의:
- BandLab 이름, 색상, 로고, 화면 스타일을 쓰지 마라.
- 지금은 오디오 기능을 구현하지 말고 앱 구조만 만든다.
```

---

### Phase 1. 디자인 시스템과 모바일 UX 토대

```text
Phase 1을 구현해줘.

목표:
- 초보자에게 친근한 모바일 DAW 디자인 시스템을 만든다.
- 다크 Studio 화면과 밝은 Home 화면을 모두 지원할 수 있는 token 구조를 만든다.

구현 요구:
1. design/tokens.ts를 다음 범주로 확장해라:
   - color.semantic.background
   - color.semantic.surface
   - color.semantic.primary
   - color.semantic.warning
   - color.semantic.danger
   - color.studio.timeline
   - color.studio.clipAudio
   - color.studio.clipMidi
   - color.studio.playhead
   - spacing, radius, shadow, zIndex, typography
2. components/ui에 아래 컴포넌트를 추가해라:
   - Screen.tsx
   - SectionHeader.tsx
   - IconButton.tsx
   - Pill.tsx
   - BottomSheet.tsx, 지금은 React Native Modal 기반 단순 구현
   - EmptyState.tsx
3. 터치 타깃은 최소 44x44를 보장해라.
4. IconButton은 icon prop을 문자열로 받는 임시 버전으로 만들고, 실제 아이콘 라이브러리는 나중에 교체 가능하게 해라.
5. 모든 컴포넌트에 TypeScript props 타입을 명확히 작성해라.
6. HomeScreen을 새 디자인 시스템으로 리팩터링해라.

완료 기준:
- HomeScreen이 카드, 섹션, CTA를 사용해 구성됨
- 작은 화면에서도 버튼이 겹치지 않음
- 접근성 label 누락 없음
- token 외 직접 색상 사용 최소화
```

---

### Phase 2. 프로젝트 데이터 모델과 로컬 상태

```text
Phase 2를 구현해줘.

목표:
- DAW 프로젝트, 트랙, 클립, 이펙트, 믹서 상태의 타입 모델을 만든다.
- Zustand store로 프로젝트 생성/수정/삭제를 구현한다.
- 아직 실제 DB는 붙이지 않고 repository 인터페이스를 먼저 만든다.

타입 요구:
- Project
  - id: string
  - title: string
  - bpm: number
  - key?: string
  - createdAt: string
  - updatedAt: string
  - tracks: Track[]
  - arrangementLengthBeats: number
- Track
  - id: string
  - projectId: string
  - type: 'audio' | 'midi' | 'drum' | 'master'
  - name: string
  - color: string
  - muted: boolean
  - solo: boolean
  - volume: number, 0~1
  - pan: number, -1~1
  - armed: boolean
  - frozen: boolean
  - effects: EffectPreset[]
  - clips: Clip[]
- Clip
  - id: string
  - trackId: string
  - type: 'audio' | 'midi' | 'drumPattern'
  - startBeat: number
  - durationBeats: number
  - sourceUri?: string
  - name: string
  - waveformPeaks?: number[]
  - midiNotes?: MidiNote[]
- EffectPreset
  - id: string
  - name: string
  - category: 'vocal' | 'guitar' | 'drum' | 'mix' | 'master'
  - friendlyDescription: string
  - parameters: Record<string, number | string | boolean>

구현 요구:
1. features/projects/projectTypes.ts를 만든다.
2. features/projects/projectFixtures.ts에 데모 프로젝트 2개를 만든다.
3. features/projects/projectStore.ts에 Zustand store를 만든다.
4. store actions:
   - createProject(template)
   - renameProject(projectId, title)
   - deleteProject(projectId)
   - addTrack(projectId, type)
   - updateTrack(projectId, trackId, patch)
   - addClip(projectId, trackId, clip)
   - updateClip(projectId, trackId, clipId, patch)
   - removeClip(projectId, trackId, clipId)
5. projectRepository.ts에는 save/load 인터페이스만 만들고 mock 구현을 둔다.
6. 간단한 unit test를 추가해 createProject와 addTrack을 검증한다.

완료 기준:
- typecheck 통과
- store action 테스트 통과
- HomeScreen에서 최근 프로젝트 fixture가 표시됨
```

---

### Phase 3. HomeScreen과 빠른 시작 UX

```text
Phase 3을 구현해줘.

목표:
- 사용자가 앱을 열자마자 “무엇을 하면 되는지” 알 수 있는 HomeScreen을 완성한다.
- BandLab처럼 창작 진입이 빠른 느낌은 가져오되, 독자적인 카드 구조와 문구를 사용한다.

화면 요구:
1. 상단:
   - 인사말: “오늘 떠오른 아이디어를 바로 남겨볼까요?”
   - 작은 상태 문구: “오프라인에서도 프로젝트가 저장됩니다”
2. 메인 CTA:
   - 큰 버튼: “새 프로젝트 만들기”
3. 빠른 시작 카드 4개:
   - “목소리 녹음” / 설명: “가사나 멜로디를 바로 캡처”
   - “비트 만들기” / 설명: “드럼 패턴부터 시작”
   - “루프 추가” / 설명: “분위기를 빠르게 잡기”
   - “오디오 가져오기” / 설명: “파일에서 시작”
4. 최근 프로젝트:
   - 제목, bpm, 트랙 수, 업데이트 시간 표시
   - 탭하면 StudioScreen으로 이동
5. CreateProjectSheet:
   - 빠른 시작 선택 시 프로젝트 생성 후 StudioScreen으로 이동
   - 각 선택은 적절한 기본 트랙을 생성한다.

기본 트랙 규칙:
- 목소리 녹음: audio track “Lead Vocal”, armed=true
- 비트 만들기: drum track “Drums”, 16-step pattern placeholder
- 루프 추가: audio track “Loop 1” + LoopsSheet 자동 open 상태
- 오디오 가져오기: audio track “Imported Audio” + Import placeholder
- 빈 프로젝트: audio track 1개

완료 기준:
- 2번 이하의 탭으로 StudioScreen 진입 가능
- 빠른 시작별 초기 트랙이 다르게 생성됨
- 모든 카드와 버튼 accessibilityLabel 있음
- 작은 화면에서 스크롤 가능
```

---

### Phase 4. StudioScreen 타임라인 UI

```text
Phase 4를 구현해줘.

목표:
- 실제 오디오 엔진 없이도 모바일 DAW처럼 보이고 조작 가능한 StudioScreen을 만든다.
- 초보자가 겁먹지 않도록 핵심 조작만 노출하고, 세부 기능은 하단 시트로 숨긴다.

StudioScreen 레이아웃:
1. StudioHeader
   - 뒤로가기
   - 프로젝트명
   - 자동저장 상태: “저장됨” 또는 “저장 중…”
   - undo/redo placeholder
   - 내보내기 버튼
2. Timeline
   - 상단 bar ruler: 1, 2, 3, 4 ... 마디 표시
   - 세로 playhead
   - 트랙별 lane
   - clip block 표시
   - pinch zoom은 지금 제외, zoom +/- 버튼만 제공
3. TrackHeader
   - 트랙명
   - mute, solo, arm 버튼
   - volume mini meter
4. TransportBar
   - 처음으로
   - 재생/정지
   - 녹음
   - 메트로놈 toggle
   - BPM 표시 버튼
5. BottomActionBar
   - 트랙 추가
   - 루프
   - 믹서
   - 효과

구현 요구:
1. src/app/projects/[id].tsx에서 projectId를 읽고 store에서 프로젝트를 찾는다.
2. components/studio에 필요한 컴포넌트를 만든다.
3. timeline의 beat-to-pixel 변환 유틸을 만든다.
4. 클립은 startBeat와 durationBeats를 기반으로 위치와 너비를 계산한다.
5. playhead는 상태값 currentBeat로 표시한다.
6. 재생 버튼을 누르면 mock timer로 currentBeat가 증가하게 한다.
7. 정지하면 currentBeat 유지, 처음으로 버튼은 0으로 이동.
8. 프로젝트가 없으면 EmptyState와 Home으로 돌아가기 버튼을 보여준다.

완료 기준:
- fixture 프로젝트가 StudioScreen에서 트랙/클립으로 보임
- play 버튼을 누르면 playhead가 움직임
- mute/solo/arm 상태가 토글됨
- UI가 가로 스크롤과 세로 스크롤을 모두 처리함
- TransportBar가 엄지 영역인 화면 하단에 고정됨
```

---

### Phase 5. AudioEngineService 추상화

```text
Phase 5를 구현해줘.

목표:
- 앱 전체가 특정 오디오 라이브러리에 묶이지 않도록 AudioEngineService 인터페이스를 만든다.
- 현재는 MockAudioEngineService로 동작시키고, expo-audio 구현을 붙일 수 있는 구조만 만든다.

구현 요구:
1. features/audio/audioTypes.ts에 타입을 만든다.
   - AudioEngineState
   - PlaybackState
   - RecordingState
   - AudioClipSource
   - AudioEngineError
2. features/audio/AudioEngineService.ts에 인터페이스를 만든다.
   - initialize(): Promise<void>
   - loadProject(project): Promise<void>
   - play(fromBeat?: number): Promise<void>
   - pause(): Promise<void>
   - stop(): Promise<void>
   - seek(beat: number): Promise<void>
   - startRecording(trackId: string): Promise<void>
   - stopRecording(): Promise<{ uri: string; durationMs: number; waveformPeaks: number[] }>
   - setTrackVolume(trackId: string, volume: number): Promise<void>
   - setTrackPan(trackId: string, pan: number): Promise<void>
   - dispose(): Promise<void>
3. MockAudioEngineService를 구현한다.
4. useAudioEngine 훅을 만든다.
5. StudioScreen의 play/pause/stop/seek를 AudioEngineService를 통해 호출하게 리팩터링한다.
6. 에러 발생 시 사용자에게 짧고 쉬운 메시지를 보여주는 audioErrorToUserMessage 함수를 만든다.

완료 기준:
- UI가 MockAudioEngineService를 통해 재생 상태를 제어함
- AudioEngineService 교체가 쉬운 구조임
- 오디오 엔진 오류가 앱 전체 크래시로 이어지지 않음
```

---

### Phase 6. 마이크 녹음 MVP

```text
Phase 6을 구현해줘.

목표:
- 사용자가 오디오 트랙에 마이크 녹음을 추가할 수 있게 한다.
- 실제 녹음은 expo-audio를 우선 사용하되, 시뮬레이터/권한 실패 상황에서는 mock recording fallback을 제공한다.

구현 요구:
1. ExpoAudioEngineService.ts를 구현한다.
2. 마이크 권한 요청 flow를 만든다.
   - 권한 요청 전 설명: “목소리나 악기를 녹음하려면 마이크 접근이 필요합니다.”
   - 거부 시 Settings 안내
3. RecordBottomSheet를 만든다.
   - 트랙명 표시
   - 입력 레벨 meter, MVP에서는 mock 가능
   - 카운트인 1마디 toggle
   - 메트로놈 toggle
   - 큰 녹음 시작/정지 버튼
   - 녹음 완료 후 “다시 녹음”, “사용하기” 버튼
4. 녹음이 완료되면 현재 playhead 위치에 Clip을 추가한다.
5. waveformPeaks는 실제 분석이 어렵다면 임시 랜덤 peak를 생성하되, TODO 주석으로 실제 분석 위치를 표시한다.
6. 녹음 파일 URI는 clip.sourceUri에 저장한다.
7. 녹음 중 앱을 닫거나 화면 전환 시 안전하게 stop/dispose하도록 처리한다.

완료 기준:
- 오디오 트랙에서 녹음 버튼을 누르면 RecordBottomSheet가 열림
- 녹음 완료 후 timeline에 clip이 추가됨
- 마이크 권한 거부 시 앱이 깨지지 않음
- 녹음 중 버튼 label과 상태가 명확히 바뀜

주의:
- 배경 녹음은 MVP에서는 끈다.
- iOS/Android 권한 문구는 app config에서 설정할 수 있게 준비한다.
```

---

### Phase 7. 트랙 추가와 루프 라이브러리

```text
Phase 7을 구현해줘.

목표:
- 사용자가 Studio 안에서 쉽게 새 트랙을 추가하고 루프를 넣을 수 있게 한다.
- 복잡한 파일 브라우저보다 “장르/무드/BPM” 중심의 쉬운 탐색을 먼저 제공한다.

구현 요구:
1. AddTrackSheet를 구현한다.
   - 목소리/악기 녹음용 오디오 트랙
   - 드럼 트랙
   - MIDI 악기 트랙 placeholder
   - 가져온 오디오 트랙 placeholder
2. features/loops/loopFixtures.ts에 저작권 문제가 없는 mock loop 메타데이터를 만든다.
   - 실제 오디오 파일을 포함하지 말고 title, genre, mood, bpm, durationBeats, color만 둔다.
3. LoopsSheet를 구현한다.
   - 검색 input
   - genre pill filter
   - mood pill filter
   - loop card list
   - 미리듣기 버튼은 mock playback
   - “프로젝트에 추가” 버튼
4. 루프 추가 시 선택된 오디오 트랙 또는 새 audio track에 Clip을 추가한다.
5. 프로젝트 BPM과 루프 BPM이 다르면 “템포가 달라요. 자동 맞춤은 v1에서 지원됩니다.” 안내를 표시한다.

완료 기준:
- AddTrackSheet에서 트랙 유형 선택 가능
- LoopsSheet에서 mock loop 검색/필터 가능
- 루프를 추가하면 timeline에 clip 표시
- 저작권 있는 샘플이나 외부 에셋 포함 없음
```

---

### Phase 8. 드럼 16-step 비트 메이커

```text
Phase 8을 구현해줘.

목표:
- 초보자가 비트를 빠르게 만들 수 있는 16-step drum grid를 구현한다.
- MVP에서는 실제 샘플 재생보다 패턴 편집 UX와 프로젝트 저장을 우선한다.

구현 요구:
1. features/drums/drumTypes.ts에 타입을 만든다.
   - DrumKit
   - DrumPad
   - DrumStep
   - DrumPattern
2. DrumMachineSheet를 만든다.
   - Kick, Snare, HiHat, Clap 4개 row
   - 16개 step column
   - 활성 step은 명확히 표시
   - 1, 5, 9, 13 step은 마디 강조
3. drum track을 탭하면 DrumMachineSheet가 열린다.
4. step을 토글하면 track.clips 또는 drumPattern 상태가 업데이트된다.
5. 기본 패턴 버튼을 제공한다.
   - “빈 패턴”
   - “팝 기본”
   - “힙합 기본”
   - “댄스 기본”
6. Transport play 시 현재 step highlight는 mock으로 진행한다.
7. 접근성: 각 step은 “Kick 1번째 스텝 켜짐/꺼짐”처럼 label을 가진다.

완료 기준:
- 비트 만들기 빠른 시작으로 만든 프로젝트에서 DrumMachineSheet 접근 가능
- step 토글 상태가 저장됨
- 기본 패턴 적용 가능
- 작은 화면에서 가로 스크롤 또는 축소 레이아웃으로 사용 가능
```

---

### Phase 9. 믹서와 쉬운 효과 프리셋

```text
Phase 9를 구현해줘.

목표:
- 사용자가 복잡한 믹싱 지식 없이도 볼륨, 팬, mute/solo, 쉬운 프리셋을 적용할 수 있게 한다.
- 전문 용어와 친근한 설명을 함께 제공한다.

구현 요구:
1. MixerSheet를 완성한다.
   - track row마다 이름, mute, solo, volume slider, pan slider
   - master volume placeholder
   - clipping warning mock: volume이 높은 트랙이 많으면 “소리가 깨질 수 있어요” 표시
2. EffectsSheet를 완성한다.
   - 카테고리: 보컬, 기타, 드럼, 믹스, 마스터
   - 프리셋 예시:
     - 보컬 선명하게: “목소리의 답답함을 줄이고 앞으로 나오게”
     - 방 안 울림 줄이기: “공간 울림을 덜 느끼게”
     - 따뜻한 기타: “거친 고음을 살짝 부드럽게”
     - 드럼 더 단단하게: “킥과 스네어의 힘을 강조”
     - 빠른 밸런스 mock: “트랙 볼륨을 자동으로 정리한 것처럼 미리보기”
3. 프리셋 적용 시 track.effects에 EffectPreset을 추가한다.
4. 이미 적용된 프리셋은 체크 표시와 제거 버튼을 보여준다.
5. 고급 설정 펼치기를 만들되, MVP에서는 parameter slider 몇 개만 표시한다.
6. 어려운 용어에는 helper text를 붙인다.
   - EQ: “밝고 어두운 느낌 조절”
   - Compressor: “소리 크기 차이를 정리”
   - Reverb: “공간감 추가”

완료 기준:
- MixerSheet에서 volume/pan 변경 시 Track 상태 업데이트
- EffectsSheet에서 프리셋 추가/제거 가능
- 초보자용 설명 문구가 모든 프리셋에 있음
- 실제 DSP가 없어도 데이터 구조가 향후 오디오 엔진과 연결 가능
```

---

### Phase 10. 클립 편집 UX

```text
Phase 10을 구현해줘.

목표:
- 모바일에서도 손가락으로 이해하기 쉬운 클립 편집을 구현한다.
- 정밀 편집보다 “선택, 이동, 복제, 삭제, 자르기”의 명확한 피드백을 우선한다.

구현 요구:
1. ClipBlock을 press하면 selected 상태로 만든다.
2. selected clip에는 테두리와 resize handle을 표시한다.
3. long press menu를 구현한다.
   - 이름 변경
   - 복제
   - 분할, MVP에서는 현재 playhead 기준
   - 삭제
4. clip drag 이동을 구현한다.
   - MVP에서는 PanResponder 또는 gesture handler 사용
   - 이동 후 startBeat를 가장 가까운 0.25 beat grid에 snap
5. splitClip action을 projectStore에 추가한다.
6. duplicateClip action을 추가한다.
7. 삭제 시 즉시 삭제하지 말고 Snackbar: “클립을 삭제했어요. 되돌리기” 제공
8. 편집 중에는 하단에 간단한 도움말을 보여준다.
   - “드래그해서 위치를 바꿔보세요”
   - “길게 눌러 복제하거나 삭제할 수 있어요”

완료 기준:
- 클립 선택/이동/복제/삭제 가능
- 분할 시 두 clip으로 나뉨
- 삭제 undo 가능
- grid snap이 동작함
- 편집 상태가 사용자에게 시각적으로 명확함
```

---

### Phase 11. Export와 빠른 마스터 mock

```text
Phase 11을 구현해줘.

목표:
- 사용자가 데모를 완성했다는 성취감을 느끼도록 export flow를 만든다.
- 실제 렌더링이 준비되기 전까지는 mock export로 UX를 검증한다.

구현 요구:
1. ExportSheet를 구현한다.
   - 프로젝트명 수정 input
   - 포맷 선택: WAV, M4A mock
   - 품질 선택: 빠른 데모, 고품질 mock
   - 빠른 마스터 toggle
2. 빠른 마스터 프리셋 mock:
   - Natural: “원래 느낌 유지”
   - Punchy: “더 힘 있게”
   - Wide: “더 넓게”
3. Export 버튼을 누르면 progress UI를 보여준다.
4. 완료 후:
   - “기기에 저장” mock
   - “공유하기” mock
   - “프로젝트로 돌아가기”
5. 실제 파일 렌더링 TODO 위치를 AudioEngineService.exportMix(project, options) 인터페이스로 준비한다.
6. export 실패 mock 상태도 처리한다.

완료 기준:
- StudioHeader의 내보내기 버튼에서 ExportSheet 열림
- export progress와 완료 상태 표시
- 실제 렌더링 미구현임을 코드상 명확한 TODO로 남김
- 사용자는 mock이어도 전체 흐름을 이해할 수 있음
```

---

### Phase 12. 자동저장, 로컬 영속화, 복구 UX

```text
Phase 12를 구현해줘.

목표:
- 창작 앱에서 가장 중요한 신뢰감을 만든다.
- 앱이 꺼져도 프로젝트 상태가 복구되도록 로컬 영속화를 붙인다.

구현 요구:
1. projectRepository에 AsyncStorage 또는 SQLite 기반 구현을 붙인다.
   - MVP에서는 AsyncStorage도 가능하지만, 파일 URI/대형 데이터는 저장하지 않는다.
   - waveformPeaks는 길어질 수 있으니 저장 크기에 주의하고 TODO로 최적화 계획 작성.
2. projectStore에 persist middleware 또는 명시적 save/load를 붙인다.
3. StudioHeader의 저장 상태를 실제 저장 debounce와 연결한다.
   - 상태: 저장 중, 저장됨, 저장 실패
4. 저장 실패 시 재시도 버튼을 보여준다.
5. 앱 시작 시 마지막 열었던 프로젝트 복귀 prompt를 보여준다.
6. 삭제 프로젝트는 즉시 완전 삭제하지 말고 soft delete 구조를 준비한다.

완료 기준:
- 앱 재시작 후 프로젝트 목록 유지
- Studio 변경 후 저장 상태 표시
- 저장 실패 상태 UI 존재
- 삭제 undo 또는 soft delete가 가능
```

---

### Phase 13. 온보딩과 권한/신뢰 UX

```text
Phase 13을 구현해줘.

목표:
- 첫 사용자가 앱의 가치를 바로 이해하고, 마이크 권한을 안심하고 허용하게 한다.
- 온보딩은 짧고 건너뛸 수 있어야 한다.

구현 요구:
1. OnboardingScreen 3장 이하:
   - “아이디어를 바로 녹음”
   - “비트와 루프로 빠르게 완성”
   - “오프라인에서도 안전하게 저장”
2. “바로 시작”과 “건너뛰기” 버튼 제공
3. 마이크 권한은 앱 시작 즉시 요구하지 말고, 첫 녹음 시점에 context 설명 후 요청한다.
4. SettingsScreen에 권한 상태 표시:
   - 마이크 허용됨/거부됨/미정
   - 저장공간 안내
5. 개인정보 문구 placeholder를 추가한다.
   - “녹음은 기본적으로 기기에 저장됩니다.”
   - “클라우드 동기화는 사용자가 켠 경우에만 업로드됩니다.”
6. 온보딩 완료 상태를 로컬 저장한다.

완료 기준:
- 첫 실행 시 온보딩 표시
- 완료 후 Home으로 이동
- 마이크 권한 요청 타이밍이 녹음 시점임
- 권한 거부 후에도 앱의 다른 기능 사용 가능
```

---

### Phase 14. v1 클라우드/협업 설계 준비

```text
Phase 14를 구현해줘.

목표:
- MVP 오프라인 앱을 망치지 않으면서 v1에서 클라우드 동기화와 협업을 붙일 수 있는 준비를 한다.
- 지금은 실제 서버 연결보다 인터페이스, 데이터 모델, UI placeholder를 만든다.

구현 요구:
1. features/sync/SyncService.ts 인터페이스를 만든다.
   - signIn()
   - signOut()
   - uploadProject(projectId)
   - downloadProject(projectId)
   - subscribeToProject(projectId)
   - resolveConflict(local, remote)
2. Project에 syncStatus 필드를 추가한다.
   - localOnly
   - syncing
   - synced
   - conflict
   - error
3. HomeScreen과 StudioHeader에 syncStatus badge를 표시한다.
4. ShareProjectSheet placeholder를 만든다.
   - “초대 링크 만들기”, disabled
   - “공동 작업자는 v1에서 지원됩니다” 안내
5. conflict resolution UX 초안을 만든다.
   - “내 버전 유지”
   - “클라우드 버전 사용”
   - “복사본 만들기”
6. 코드 주석에 Supabase Auth/Storage/Realtime 연결 지점을 명확히 남긴다.

완료 기준:
- syncStatus가 타입과 UI에 반영됨
- 앱은 로그인 없이도 완전히 사용 가능
- 협업 placeholder가 사용자에게 과도한 기대를 주지 않음
```

---

### Phase 15. 접근성, 현지화, 초보자 도움말

```text
Phase 15를 구현해줘.

목표:
- 모바일 DAW가 어렵게 느껴지지 않도록 도움말과 접근성을 강화한다.
- 한국어 우선이지만 영어 확장이 쉬운 구조를 만든다.

구현 요구:
1. i18n 구조를 만든다.
   - ko.ts
   - en.ts
   - t(key) helper
2. 주요 문구를 하드코딩에서 i18n key로 옮긴다.
3. 접근성 점검:
   - 모든 touchable에 accessibilityRole/Label
   - mute/solo/arm 토글은 selected state 전달
   - 스크린리더에서 track과 clip의 의미가 읽힘
4. 초보자 도움말 CoachMark를 만든다.
   - 첫 Studio 진입 시 Transport Bar 위에 “여기서 재생과 녹음을 시작해요”
   - 첫 클립 추가 후 “클립을 길게 누르면 편집할 수 있어요”
5. Settings에서 도움말 다시 보기 제공
6. 터치 영역이 작은 컴포넌트를 찾아 hitSlop 보강

완료 기준:
- 한국어 문구가 i18n에서 관리됨
- 스크린리더용 label이 핵심 요소에 있음
- CoachMark가 방해되지 않고 닫을 수 있음
- 작은 화면에서도 조작 가능
```

---

### Phase 16. 성능 최적화와 오디오 리스크 관리

```text
Phase 16을 구현해줘.

목표:
- 타임라인 트랙/클립이 늘어나도 UI가 버벅이지 않게 한다.
- 실제 오디오 엔진 확장 시 발생할 수 있는 리스크를 코드와 문서에 명확히 정리한다.

구현 요구:
1. Timeline 렌더링 최적화:
   - TrackLane memoization
   - ClipBlock memoization
   - beatToPx 계산 useMemo
   - 큰 프로젝트에서 FlatList 또는 virtualization 검토 TODO
2. waveformPeaks 렌더링 최적화:
   - peak 개수를 화면 너비에 맞게 downsample
   - Waveform 컴포넌트 memoization
3. playback timer와 UI render loop를 분리한다.
   - requestAnimationFrame 또는 interval 사용 위치 명확화
   - 실제 오디오 clock과 UI clock 동기화 TODO
4. Settings > Audio Debug 화면을 만든다.
   - engine type: mock/expo/native
   - sample rate placeholder
   - buffer size placeholder
   - latency estimate placeholder
5. docs/audio-roadmap.md를 작성한다.
   - MVP expo-audio 한계
   - native engine 필요 조건
   - JSI/TurboModule로 확장하는 이유
   - iOS/Android 엔진 후보
   - export/render 계획
   - freeze track 계획

완료 기준:
- Timeline 관련 컴포넌트가 불필요하게 전체 재렌더링되지 않음
- Audio Debug 화면 존재
- audio-roadmap.md에 프로덕션 오디오 엔진 계획이 있음
```

---

### Phase 17. 베타 출시 체크리스트

```text
Phase 17을 구현해줘.

목표:
- 내부 베타 테스트 가능한 수준으로 앱을 정리한다.
- 미완성 기능은 숨기거나 명확한 placeholder로 정리한다.

구현 요구:
1. README에 베타 범위를 명시한다.
2. docs/beta-test-plan.md를 만든다.
3. 테스트 시나리오를 작성한다.
   - 새 프로젝트 생성
   - 보컬 녹음 추가
   - 루프 추가
   - 드럼 패턴 만들기
   - 트랙 볼륨 조절
   - 클립 이동/삭제/되돌리기
   - 앱 재시작 후 복구
   - export mock 완료
4. known issues 목록을 만든다.
5. crash-safe guard를 추가한다.
   - project undefined
   - missing sourceUri
   - permission denied
   - storage save fail
6. UI 문구에서 “곧 지원”과 “mock”을 사용자용 표현으로 바꾼다.
   - 개발자 주석에는 mock이라고 남겨도 됨
   - 사용자에게는 “미리보기”, “준비 중”처럼 표현

완료 기준:
- 베타 테스트 문서 존재
- 핵심 journey가 앱 크래시 없이 수행됨
- 미완성 기능이 사용자에게 혼란스럽지 않음
```

---

## 7. UX 리파인먼트 프롬프트

아래 프롬프트들은 구현 후 UI를 다듬을 때 반복해서 사용할 수 있습니다.

### 7.1 초보자 친화성 개선

```text
현재 앱을 초보자가 처음 사용하는 상황으로 검토해줘.

목표:
- 사용자가 다음 행동을 몰라 멈추는 지점을 줄인다.
- DAW 전문 용어를 친근한 문구로 바꾼다.

작업:
1. HomeScreen, CreateProjectSheet, StudioScreen, MixerSheet의 CTA를 점검해라.
2. 한 화면에 주요 CTA가 2개 이상 경쟁하면 우선순위를 정리해라.
3. 전문 용어에는 쉬운 설명을 붙여라.
4. 빈 상태는 반드시 다음 행동을 안내하게 바꿔라.
5. 오류 메시지는 원인 + 해결 행동으로 바꿔라.
6. 변경 전/후 문구를 요약해라.
```

### 7.2 엄지손가락 조작성 개선

```text
현재 모바일 UI를 한 손 조작 기준으로 개선해줘.

작업:
1. Transport, Record, Add Track, Mixer 같은 자주 쓰는 액션이 화면 하단 엄지 영역에 있는지 확인해라.
2. 44x44보다 작은 터치 영역을 찾아 수정해라.
3. 작은 화면에서 TrackHeader와 Timeline이 겹치지 않게 조정해라.
4. BottomSheet가 너무 높으면 3단계 snap point 구조로 바꿔라: peek, half, full.
5. 가로 스크롤 영역과 세로 스크롤 영역의 제스처 충돌을 줄여라.
```

### 7.3 Studio 화면 복잡도 줄이기

```text
StudioScreen이 초보자에게 복잡해 보이지 않도록 리파인해줘.

작업:
1. 첫 진입 시 보여야 하는 기능과 숨겨도 되는 기능을 분리해라.
2. 고급 기능은 “더 보기” 또는 BottomSheet 안으로 이동해라.
3. TrackHeader에는 mute, solo, arm만 우선 표시하고 volume/pan은 MixerSheet로 이동할지 검토해라.
4. 비어 있는 트랙에는 “녹음하기” 또는 “루프 추가” inline CTA를 표시해라.
5. playhead, clips, selected state의 시각적 위계를 강화해라.
```

### 7.4 음악 제작 피드백 강화

```text
사용자가 음악을 만들고 있다는 감각이 더 강하게 들도록 피드백을 강화해줘.

작업:
1. 녹음 시작/정지, 클립 추가, 루프 추가, 프리셋 적용 시 micro-interaction을 추가해라.
2. 과한 애니메이션은 피하고 150~250ms 범위의 짧은 전환을 사용해라.
3. 녹음 중에는 level meter, timer, status label을 명확히 보여줘라.
4. 재생 중에는 playhead와 현재 step highlight가 안정적으로 움직이게 해라.
5. 성공 상태에는 짧은 snackbar를 보여줘라.
```

---

## 8. QA/성능/리팩터링 프롬프트

### 8.1 전체 코드 품질 점검

```text
현재 코드베이스를 전체 점검해줘.

검토 기준:
1. TypeScript any 남용 제거
2. 중복 컴포넌트 통합
3. design token 미사용 색상/spacing 정리
4. projectStore action이 너무 커졌다면 slice로 분리
5. AudioEngineService 인터페이스와 구현 분리 상태 확인
6. UI 컴포넌트와 비즈니스 로직 분리
7. 접근성 label 누락 점검
8. 에러 경계와 fallback UI 점검

결과물:
- 수정 코드
- 변경 파일 목록
- 남은 기술부채 목록
```

### 8.2 오디오 안정성 점검

```text
오디오 기능의 안정성을 점검하고 개선해줘.

검토 상황:
1. 마이크 권한 거부
2. 녹음 중 앱 background 전환
3. 녹음 중 전화/다른 오디오 interruption
4. 녹음 파일 URI 없음
5. 재생 중 프로젝트 변경
6. 빠르게 play/pause 반복
7. AudioEngineService dispose 누락

작업:
- 위 상황에서 앱이 크래시하지 않도록 guard를 추가해라.
- 사용자 메시지는 짧고 행동 가능하게 작성해라.
- 실제 native audio engine으로 갈 때 필요한 TODO를 코드 주석과 docs/audio-roadmap.md에 정리해라.
```

### 8.3 타임라인 성능 점검

```text
Timeline 성능을 최적화해줘.

가정:
- 프로젝트당 최대 8트랙
- 트랙당 최대 20클립
- waveformPeaks가 clip마다 200~1000개 있을 수 있음

작업:
1. ClipBlock과 TrackLane을 React.memo로 감싸라.
2. prop identity가 매 렌더마다 바뀌지 않도록 useMemo/useCallback을 적용해라.
3. waveformPeaks는 화면 표시 너비 기준으로 downsample해라.
4. selectedClipId, currentBeat 변경이 전체 트랙을 과도하게 렌더링하지 않는지 점검해라.
5. 필요하면 TimelineContext를 분리하거나 store selector를 세분화해라.
6. 성능 개선 전후를 수동 측정할 수 있는 Debug overlay를 추가해라.
```

---

## 9. 프롬프트 안에 계속 유지해야 할 제품 원칙

AI 코딩 에이전트가 방향을 잃을 때 아래 문장을 다시 붙여 넣으세요.

```text
제품 원칙을 다시 상기해라.

이 앱은 프로 DAW의 모든 기능을 모바일에 우겨 넣는 앱이 아니다. 사용자가 음악 아이디어를 빠르게 시작하고, 녹음하고, 비트를 얹고, 간단히 믹스하고, 데모로 저장하는 앱이다.

우선순위:
1. 빠른 시작
2. 명확한 다음 행동
3. 안정적인 저장
4. 큰 터치 영역
5. 쉬운 문구
6. 점진적 고급 기능
7. 오프라인 우선
8. 나중에 교체 가능한 오디오 엔진

BandLab에서 배울 점은 창작 진입의 낮은 장벽과 모바일 중심 흐름이다. 절대 BandLab의 화면, 브랜드, 문구, 에셋을 복제하지 않는다.
```

---

## 10. 데이터 모델 상세 설계

### 10.1 Project JSON 예시

```json
{
  "id": "project_001",
  "title": "밤 산책 데모",
  "bpm": 92,
  "key": "A minor",
  "createdAt": "2026-07-03T12:00:00.000Z",
  "updatedAt": "2026-07-03T12:05:00.000Z",
  "arrangementLengthBeats": 64,
  "syncStatus": "localOnly",
  "tracks": [
    {
      "id": "track_vocal_001",
      "projectId": "project_001",
      "type": "audio",
      "name": "Lead Vocal",
      "color": "audioBlue",
      "muted": false,
      "solo": false,
      "volume": 0.82,
      "pan": 0,
      "armed": false,
      "frozen": false,
      "effects": [
        {
          "id": "fx_vocal_clear",
          "name": "보컬 선명하게",
          "category": "vocal",
          "friendlyDescription": "목소리의 답답함을 줄이고 앞으로 나오게",
          "parameters": {
            "eqHigh": 0.25,
            "compression": 0.35,
            "deEss": 0.2
          }
        }
      ],
      "clips": [
        {
          "id": "clip_001",
          "trackId": "track_vocal_001",
          "type": "audio",
          "startBeat": 0,
          "durationBeats": 16,
          "sourceUri": "file:///recordings/take001.m4a",
          "name": "Take 1",
          "waveformPeaks": [0.1, 0.3, 0.2, 0.8]
        }
      ]
    }
  ]
}
```

### 10.2 상태 업데이트 규칙

```text
- 모든 편집은 Project.updatedAt을 갱신한다.
- clip 이동/분할/삭제는 undo stack에 남긴다.
- sourceUri는 로컬 파일 경로만 저장하고, 클라우드 업로드 후에는 remoteUri를 별도 필드로 추가한다.
- waveformPeaks는 렌더링 최적화를 위해 clip별로 저장하되, 너무 커지면 캐시 파일로 분리한다.
- effects는 실제 DSP chain이 아니라 “의도와 파라미터”를 저장한다. 오디오 엔진이 바뀌어도 project format이 유지되어야 한다.
```

---

## 11. 화면별 상세 UX 명세

### 11.1 HomeScreen

```text
목표: 사용자가 바로 창작을 시작하게 한다.

필수 요소:
- 큰 새 프로젝트 CTA
- 빠른 시작 카드 4개
- 최근 프로젝트 목록
- 오프라인 저장 신뢰 문구
- 설정 진입

사용자 심리:
- “뭘 눌러야 하지?”가 없어야 한다.
- “일단 녹음해볼까?”가 바로 가능해야 한다.
```

### 11.2 CreateProjectSheet

```text
목표: DAW 템플릿 선택을 어렵지 않게 만든다.

카드 문구:
- 목소리 녹음: “멜로디, 가사, 랩을 바로 남겨요”
- 비트 만들기: “킥과 스네어로 리듬부터 시작해요”
- 루프 추가: “분위기에 맞는 사운드를 얹어요”
- 오디오 가져오기: “기존 파일을 불러와 편집해요”
- 빈 프로젝트: “내 방식대로 처음부터 만들어요”

동작:
- 선택 즉시 project 생성
- StudioScreen으로 이동
- 선택 유형에 맞는 sheet를 자동으로 열 수 있음
```

### 11.3 StudioScreen

```text
목표: 모바일 DAW의 핵심을 압축하되 혼란을 줄인다.

상단:
- 뒤로가기
- 프로젝트명
- 저장 상태
- 내보내기

중앙:
- timeline ruler
- playhead
- track lanes
- clips

하단:
- transport bar
- add/loops/mixer/effects action

초보자 도움:
- 빈 트랙에는 inline CTA 표시
- 첫 진입 coach mark
- 클립 long press 안내
```

### 11.4 RecordBottomSheet

```text
목표: 녹음이 무섭지 않게 만든다.

상태:
- idle: “녹음할 준비가 됐어요”
- countingIn: “곧 시작합니다”
- recording: timer + level meter
- recorded: “녹음이 완료됐어요”
- error: 원인 + 해결 버튼

버튼:
- 녹음 시작
- 정지
- 다시 녹음
- 사용하기
```

### 11.5 MixerSheet

```text
목표: 믹싱을 어렵지 않게 만든다.

초보 모드:
- volume: “크기”
- pan: “좌우 위치”
- mute: “잠시 끄기”
- solo: “이것만 듣기”

고급 모드:
- EQ
- Compressor
- Reverb
- Automation, v1
```

---

## 12. 기술 로드맵

### 12.1 MVP 오디오 전략

```text
MVP에서는 “제품 UX 검증”이 우선이다.

구현:
- expo-audio로 녹음과 단일/간단 재생을 구현
- 멀티트랙 믹싱은 초기에는 mock 또는 제한적 구현
- 프로젝트 구조와 UI는 실제 오디오 엔진으로 갈 수 있게 추상화

리스크:
- 정확한 멀티트랙 동기화
- 낮은 latency
- 실시간 DSP
- 긴 파일 waveform 분석
- export/render

대응:
- AudioEngineService 인터페이스 고정
- UI clock과 audio clock 분리
- 추후 native module로 대체
```

### 12.2 프로덕션 오디오 전략

```text
v1 이후 목표:
- iOS: AVAudioEngine 또는 AudioKit 기반 graph
- Android: Oboe/AAudio 기반 low-latency playback/recording
- React Native: JSI/TurboModule로 JS와 native engine 연결
- DSP: gain, pan, EQ, compressor, reverb 기본 chain
- Offline render: project graph를 WAV/M4A로 bounce
- Freeze: 트랙을 임시 audio stem으로 렌더링해 CPU 절약
```

### 12.3 클라우드/협업 전략

```text
v1 이후 목표:
- Auth: 이메일, Apple, Google
- Project metadata: Postgres
- Audio files/stems: Object Storage
- Realtime: presence, comments, project update notifications
- Conflict resolution: operation log 또는 project versioning
- Offline-first sync: local changes queue → remote merge

주의:
- 녹음 파일은 사용자가 명시적으로 동기화를 켠 경우에만 업로드
- 프로젝트 공유 링크에는 권한 만료와 revoke 기능 필요
- 공개 피드/소셜 기능은 DAW MVP 이후 검토
```

---

## 13. 앱을 “가장 직관적”으로 만들기 위한 제품 체크리스트

```text
빠른 시작:
[ ] 앱 첫 화면에서 녹음/비트/루프 시작이 보이는가?
[ ] 2탭 이내 Studio 진입이 가능한가?
[ ] 빈 프로젝트에서도 다음 행동이 명확한가?

모바일 조작성:
[ ] Record/Play/Add가 엄지 영역에 있는가?
[ ] 모든 터치 타깃이 44px 이상인가?
[ ] 작은 화면에서 글자와 버튼이 겹치지 않는가?

초보자 친화성:
[ ] 전문 용어 옆에 쉬운 설명이 있는가?
[ ] 오류 메시지가 해결 행동을 포함하는가?
[ ] 고급 기능이 처음부터 과하게 노출되지 않는가?

창작 안정감:
[ ] 자동저장이 보이는가?
[ ] 삭제/편집을 되돌릴 수 있는가?
[ ] 권한 거부나 파일 오류에도 앱이 멈추지 않는가?

DAW 핵심성:
[ ] 트랙/클립/타임라인 관계가 명확한가?
[ ] playhead가 재생 상태를 즉시 보여주는가?
[ ] mixer와 effects가 track 상태와 연결되는가?

확장성:
[ ] AudioEngineService가 UI와 분리되어 있는가?
[ ] project schema가 cloud sync로 확장 가능한가?
[ ] effects가 실제 DSP 구현 전에도 의도를 저장하는가?
```

---

## 14. 피해야 할 실수

```text
1. 첫 화면에 소셜 피드부터 넣지 말 것
   - 창작 앱의 첫 행동은 감상/탐색보다 만들기여야 한다.

2. 전문 DAW 기능을 한 화면에 모두 넣지 말 것
   - automation, EQ, compressor, routing은 고급 영역으로 숨긴다.

3. 실제 오디오 엔진을 너무 늦게 생각하지 말 것
   - MVP가 mock이어도 AudioEngineService 추상화는 초기에 만든다.

4. 저장 상태를 숨기지 말 것
   - 창작물 손실 공포는 음악 앱 이탈의 큰 원인이다.

5. 권한을 앱 시작과 동시에 요구하지 말 것
   - 사용자가 녹음을 누르는 맥락에서 마이크 권한을 요청한다.

6. 경쟁 앱의 시각 디자인을 복제하지 말 것
   - 영감은 흐름에서 얻고, 표현은 완전히 새로 만든다.

7. 루프/샘플 저작권을 가볍게 보지 말 것
   - MVP에는 실제 상용 샘플을 포함하지 않는다.
```

---

## 15. 최종 통합 프롬프트

앱 골격이 어느 정도 만들어졌을 때 아래 프롬프트로 전체 방향을 다시 정렬하세요.

```text
지금까지 구현된 PocketStudio 앱을 “가장 직관적이고 사용자 친화적인 모바일 DAW”라는 목표에 맞춰 통합 점검하고 개선해줘.

점검 관점:
1. 사용자가 10초 안에 녹음 시작 버튼을 찾을 수 있는가?
2. 사용자가 30초 안에 첫 clip을 timeline에 추가할 수 있는가?
3. 사용자가 3분 안에 2트랙 demo를 만들고 export flow까지 볼 수 있는가?
4. StudioScreen이 초보자에게 너무 복잡하지 않은가?
5. Home → Create → Studio → Record/Loop/Beat → Mix → Export 흐름이 끊기지 않는가?
6. 모든 위험 작업에 undo 또는 취소가 있는가?
7. 마이크 권한, 저장 실패, 파일 URI 없음 같은 edge case가 안전한가?
8. AudioEngineService 추상화가 유지되는가?
9. BandLab을 포함한 기존 앱의 브랜드/화면/문구/에셋을 복제하지 않았는가?
10. 한국어 사용자에게 문구가 자연스러운가?

작업 방식:
- 먼저 문제 목록을 우선순위 P0/P1/P2로 정리해라.
- P0 문제는 즉시 코드로 수정해라.
- P1/P2는 TODO와 docs/roadmap.md에 남겨라.
- 수정 후 핵심 사용자 여정을 수동 테스트 체크리스트로 출력해라.
```

---

## 16. 참고 출처

이 문서는 BandLab의 공개 설명과 모바일 DAW 개발에 필요한 공식 기술 문서를 참고해 UX 패턴과 기술 리스크를 정리했습니다.

1. BandLab Google Play 설명: 모바일 DAW 안에서 보컬 녹음, 비트 제작, 데모 믹스, 협업 플랫폼을 강조합니다.  
   https://play.google.com/store/apps/details?id=com.bandlab.bandlab
2. BandLab App Store 설명: 모바일 DAW, 협업, 멤버십 기반 AI/배포/기회 기능을 설명합니다.  
   https://apps.apple.com/sa/app/bandlab-music-making-studio/id968585775
3. BandLab Studio 초보자 가이드: Studio의 Automation, Voice Cleaner, audio presets 등 초보자용 기능을 소개합니다.  
   https://blog.bandlab.com/studio-faq/
4. BandLab 모바일 Automation 가이드: 모바일과 웹에서 Automation을 사용해 볼륨, 팬, 이펙트 변화를 설정하는 흐름을 설명합니다.  
   https://blog.bandlab.com/how-to-use-mobile-automation-in-music-production/
5. BandLab 믹싱 가이드: 볼륨, 팬, EQ, compression, effects 같은 기본 믹싱 요소와 AutoMix 개념을 설명합니다.  
   https://blog.bandlab.com/how-to-mix-music/
6. BandLab Help Center 오디오 문제 안내: 기기 처리 성능 부족 시 track freeze가 처리 부담을 줄이는 방법이라고 설명합니다.  
   https://help.bandlab.com/hc/en-us/articles/360013212434-Something-is-wrong-with-my-audio
7. Expo `expo-audio` 공식 문서: React Native/Expo 앱에서 녹음, 재생, 배경 오디오 설정을 다룹니다.  
   https://docs.expo.dev/versions/latest/sdk/audio/
8. React Native New Architecture 공식 문서: JSI, Fabric, TurboModules 등 새 아키텍처의 목적과 성능 관련 구조를 설명합니다.  
   https://reactnative.dev/architecture/landing-page
9. Supabase 공식 문서: Database, Auth, Storage, Realtime, Edge Functions 등 협업/클라우드 기능 확장에 필요한 제품 범주를 설명합니다.  
   https://supabase.com/docs
10. Expo Supabase 가이드: Expo/React Native에서 Supabase를 사용하는 연결 지점을 안내합니다.  
    https://docs.expo.dev/guides/using-supabase/

---

## 17. 한 줄 요약

```text
BandLab에서 배울 것은 “쉽게 시작해서 끝까지 이어지는 모바일 음악 제작 흐름”이고, 우리가 만들 것은 그 원칙을 독자적인 UX와 확장 가능한 오디오 아키텍처로 재해석한 PocketStudio다.
```

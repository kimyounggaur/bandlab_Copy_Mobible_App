# LoopPocket baseline (2026-09-21)

Measured at commit `324d578` before the R0 source changes.

| Metric | Result |
|---|---:|
| `npm run build` | Passed |
| Production JS | 457.54 kB (gzip 126.98 kB) |
| Production CSS | 14.98 kB (gzip 4.18 kB) |
| PWA precache | 57 entries, 8747.42 KiB |
| TS/TSX source | 31 files, 2717 lines (PowerShell line count) |
| Automated tests before R0 | 0 |

| R0 `npm test` | 3 files, 21 tests passed |
| R0 `npm run lint` | 0 errors, 4 warnings (2 `no-await-in-loop`, 2 `no-array-index-key`) |
| R0 `npm run typecheck` | Passed |

## P2 asset pipeline (2026-09-21)

| Metric | Result |
|---|---:|
| 44.1kHz FLAC, 48 loops | 6,379,543 bytes |
| Starter FLAC, 6 loops | 880,534 bytes (860 KiB) |
| Workbox glob precache | 532.48 KiB, 26 entries |
| Effective precache with starter entries | about 1,392.5 KiB |
| Initial JS gzip (index + projectStore + music + react + tone) | about 134 KiB |
| React/Tone chunk hashes after app-only changes | Unchanged (`react-mY3wn5LK`, `tone-C3-uAaqb`) |
| Desktop Chromium format alignment (drums/bass/melody) | FLAC and WAV: 0-sample offset, 0-sample length difference |
| Desktop Chromium offline installed starter playback | Passed; track and master meters moved |
| Desktop Chromium offline uncached loop | Addition blocked; sheet remained open |
| iOS Safari / Android Chrome sample alignment | Not measured on physical devices |
| Fast 3G first sound / low-end Android 8-track load | Not measured on physical devices |

## M2 recording (2026-09-21)

| Metric | Result |
|---|---:|
| Recording anchor, pre-roll and quarter-bar placement tests | Passed |
| Eight-click calibration median analysis test | Passed |
| Browser count-in transport isolation and cancel | Passed (desktop Chromium) |
| Mobile-size recording sheet layout | Inspected at 390 x 844 |
| Headless browser microphone | No device; recording returned an error |
| Wired/Bluetooth clap alignment, live monitoring and feedback cutoff | Not measured on physical devices |

## M3 instruments (2026-09-21)

| Metric | Result |
|---|---:|
| 44.1kHz stereo one-shot kit | 16 distinct WAV files, 1,267,256 bytes |
| Pad Web Audio source creation | Confirmed in desktop Chromium |
| Drum and keys performance clip creation and playback | Passed in desktop Chromium |
| Raw note position survives quantize off | Confirmed in IndexedDB |
| Note-inclusive WAV export | Completed in desktop Chromium |
| Wired/speaker tap-to-sound latency and rapid tapping | Not measured on physical devices |

## D1 storage durability (2026-09-21)

| Metric | Result |
|---|---:|
| v1/v2 to v3 migration, damaged quarantine, future version preservation | Automated tests passed |
| Orphan recording deletion, undo reference and future-project guard | Automated tests passed |
| Storage persistence prompt and usage/80% warning | Implemented; browser grant varies by device |
| Autosave max wait, visibility/pagehide flush | Implemented; physical mobile lifecycle not measured |
| Test suite after D1 | 60 tests passed |

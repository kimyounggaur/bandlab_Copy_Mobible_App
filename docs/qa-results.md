# Regression status (2026-09-21)

## Verified

| Area | Evidence |
|---|---|
| Automated behavior | 63 Vitest tests passed; typecheck, lint, and production build passed |
| First-run flow | Genre selection entered studio in desktop Chromium |
| Playback | Transport started and stopped with starter loops in desktop Chromium |
| Loop addition | New clip appeared; programmatic sheet close consumed its history entry |
| Project durability | Rename and added loop survived a synthetic pagehide followed by reload |
| WAV export | 4,116,044-byte WAV downloaded in desktop Chromium |
| Hash routing | Home/studio Back, sheet Back, and UI-close history behavior checked in desktop Chromium |
| Local metrics | First-sound, first-loop, and first-export events appeared in the dev funnel; legacy migration has a unit test |
| Mobile layout | Studio, storage sheet, and funnel inspected at 390 x 844 in Chromium |
| Storage safety | v1/v2 migrations, quarantine, future-version preservation, and undo-aware audio GC have automated tests |
| PWA bundle | Starter audio plus code precache remains below 1,500 KiB; development pages are absent from production build |

## Not Yet Verified

- Actual acoustic 30-second first-sound and 3-minute composition targets on a low-end Android phone and an iPhone.
- Microphone permission, wired/Bluetooth calibration, monitoring feedback, and acoustic recording alignment on physical devices.
- Android hardware Back, screen Wake Lock, iOS silent switch, home-screen icon clipping, phone interruption, and headphone removal on physical devices.
- Waveform, solo/effect fidelity, and the full 54-item manual regression matrix on hardware.

Passing automated and desktop browser checks does not imply these device-specific acceptance criteria passed. The protocols are in `docs/ux-metrics.md` and `docs/platform-verification.md`.

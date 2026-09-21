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

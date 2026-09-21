# 30-second / 3-minute measurement

## Targets

- First audible sound: no more than 30 seconds after app open.
- Eight-bar completion: no more than 3 minutes after app open.
- Completion predicate in the implementation: clips on at least two different tracks, with at least eight bars summed across clips. The default two four-bar starter clips satisfy this immediately.
- Events and session timelines are stored locally in IndexedDB meta; no analytics requests leave the device.

## Physical-device protocol

1. Clear the app's site data completely, including IndexedDB and service-worker caches.
2. Turn airplane mode off, connect to the normal test network, and open the app.
3. Start an external stopwatch at page open. Complete onboarding and press Play for the first audible sound.
4. Build an arrangement satisfying the two-track/eight-total-bar predicate.
5. Record the elapsed stopwatch times, device/browser, date, commit, network, and whether audio was actually audible.
6. Repeat after each phase. A phase exceeding either target is not accepted on that device.

## Measurements

| Date | Commit | Device / browser | First audible sound | Eight bars | Status |
|---|---|---|---:|---:|---|
| 2026-09-21 | D3 working tree | Desktop Chromium automation | Not measured audibly | Not measured | Funnel smoke test: UI displayed first_sound 29s and eight_bar_complete 0s; tool interaction delay makes this nonrepresentative |
| Pending | Pending | Low-end Android / Chrome | Not measured | Not measured | Physical device unavailable |
| Pending | Pending | iPhone / Safari | Not measured | Not measured | Physical device unavailable |

The required two-device acceptance measurement remains open. The app cannot establish acoustic audibility, so the on-device stopwatch is necessary.

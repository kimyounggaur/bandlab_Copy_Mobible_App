# Mobile platform verification

## Implemented

- Hash routes: `#/studio`, `#/`, and development-only `#/dev/*`.
- Sheet Back handling and UI close history consumption, checked in desktop Chromium.
- Screen Wake Lock is requested only while playing or recording, and retried on visibility return.
- A suspended AudioContext exposes a resume button in the transport.
- The first iOS playback displays a one-time silent-switch hint. Help remains available in the transport.
- 192/512 PNG, maskable PNG, and iOS touch PNG generated from the app logo.

## Physical-device checks still required

| Check | Android Chrome | iPhone Safari |
|---|---|---|
| Hardware/gesture Back closes sheets | Not measured | Not applicable |
| Wake Lock prevents sleep and releases on stop | Not measured | Not measured |
| Home-screen icon and mask clipping | Not measured | Not measured |
| Phone-call interruption and resume button | Not measured | Not measured |
| Silent switch and Audio Session API behavior | Not applicable | Not measured |
| Headphone unplug detection reliability | Not measured | Not measured |

The Audio Session API is deliberately not enabled: its silent-switch effect has not been verified on a physical iPhone. Browser `devicechange` does not reliably identify a removed output device across browsers and permissions, so headphone removal is not used for automatic pause. Test those cases on hardware before claiming them as supported.

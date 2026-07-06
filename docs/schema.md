# LoopPocket Project JSON Schema

```jsonc
{
  "version": 1,
  "id": "uuid",
  "name": "내 프로젝트",
  "createdAt": 0,
  "updatedAt": 0,
  "bpm": 90,
  "key": "Cm",
  "timeSignature": [4, 4],
  "loopLengthBars": 8,
  "tracks": [
    {
      "id": "uuid",
      "name": "드럼",
      "type": "audio",
      "color": "#FF6B6B",
      "volume": 80,
      "pan": 0,
      "mute": false,
      "solo": false,
      "effects": {
        "reverb": { "on": false, "mode": "room", "amount": 0 },
        "delay": { "on": false, "sync": "1/8", "amount": 0 },
        "tone": { "on": false, "tilt": 50, "bassBoost": false },
        "vocalPreset": null
      },
      "clips": [
        {
          "id": "uuid",
          "startBar": 0,
          "lengthBars": 4,
          "gain": 1,
          "source": { "kind": "loop", "loopId": "drums_01" }
        }
      ]
    }
  ]
}
```

## Rules

- `startBar` and `lengthBars` snap to 0.25 bar.
- `tracks` is capped at 8 items for MVP.
- Recording audio is stored in IndexedDB `audio`; project JSON only keeps an `audioId`.
- Effects store intent and simple parameters, so the audio engine can be replaced later.

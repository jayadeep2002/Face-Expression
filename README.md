# Real-time Emoji from Expression (Web, JavaScript)

A lightweight web app that uses `face-api.js` to detect basic facial emotions in real time and display a matching emoji.

## Features
- Neutral, Happy, Sad, Angry, Fearful, Disgusted, Surprised
- Real-time webcam inference (TinyFaceDetector + FaceExpressionNet)
- Smoothing slider to reduce flicker (EMA)
- Confidence threshold and update interval controls

## Quick Start
1. Open a local web server in this folder (required by some browsers for camera access):
   - VS Code: install "Live Server" extension and click "Go Live".
   - Node (PowerShell): `npx serve -l 5173`
   - Python: `python -m http.server 5173`
2. Visit `http://localhost:5173` (or the port your server prints).
3. Allow camera permission when prompted.

## Files
- `index.html` – UI structure and control panel.
- `styles.css` – Dark theme and overlay styling.
- `script.js` – Webcam init, model loading, detection loop, EMA smoothing, emoji mapping.

## Models
- Loaded from CDN: `https://justadudewhohacks.github.io/face-api.js/models`
- For offline use, download the model files into `./models` and update `MODEL_URL` in `script.js` to `./models`.

## Notes
- Performance depends on hardware; try lowering `update interval (ms)` or increasing `smoothing`.
- If detection is unstable, increase `Min face score`.

## Roadmap
- Add landmark-based heuristics fallback.
- Multi-face selection UI.
- PWA support for offline use.

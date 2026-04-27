# Jeeliz FaceFilter assets (RawStock)

## Contents

- `neuralNets/NN_DEFAULT.json` — default neural network weights shipped with [jeeliz/jeelizFaceFilter](https://github.com/jeeliz/jeelizFaceFilter) (`/neuralNets/NN_DEFAULT.json`).
- `JeelizCanvas2DHelper.js` — helper from the same repository (`/helpers/JeelizCanvas2DHelper.js`) used to draw 2D overlays on top of the camera texture in WebGL.

## License

Jeeliz FaceFilter is distributed under the **FaceFilter licence** from the upstream project. Review [their LICENSE / README](https://github.com/jeeliz/jeelizFaceFilter) before production use.

## Main library

The minified core `jeelizFaceFilter.js` is loaded at runtime from the official CDN (`https://appstatic.jeeliz.com/faceFilter/jeelizFaceFilter.js`) by `components/web/FaceFilter.tsx`.

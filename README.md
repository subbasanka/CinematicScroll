# DURAMAX | Premium Cinematic Interactive 3D HDPE Packaging Experience

An elite, high-fidelity WebGL interactive showcase featuring the **DURAMAX** luxury sustainable high-density polyethylene (HDPE) bottle. Designed as a high-fashion, immersive B2B product showcase, this project integrates scroll-triggered physics, procedural canvas typography shaders, and real-time sensory sound design.

---

## 🎭 Advanced Cinematic Features

### 1. True HDPE Translucency & Fluid Core
* **Material Translucency**: The **Frosted Opal** (`opacity: 0.45`) and **Glossy Alabaster** (`opacity: 0.58`) body profiles mimic real high-density polyethylene, letting the colorful contents show naturally through the outer plastic walls.
* **Refractive Fluid Cylinder**: A solid inner liquid core occupies the body up to a realistic 75% fill line.
* **WebGL Render Ordering**: Explicit layers (`liquidMesh.renderOrder = 1`, `bottleMesh.renderOrder = 2`) force WebGL to draw the liquid first and transparent walls second, guaranteeing flawless blending from all viewing angles with zero depth conflicts.

### 2. Physical Scroll-Triggered Mechanics (Cap Opening)
* **Helical Gliding Animation**: As you scroll through the **Unseal** section, the cap rotates **-1170° (-6.5π)** and translates up vertically from `3.25` to `5.8` along the bottle's mathematical helical threads.
* **Hollow Open Neck**: The bottle's double-walled `LatheGeometry` is built with a hollow cylindrical mouth, allowing users to look down directly into the bottle to view the active formula pool.

### 3. Tactile Cinematic Web Audio Synthesizer
* **Ambient Pad Synth**: A low-frequency triangle and detuned sine oscillator pad changes pitch and amplitude dynamically in response to scroll speed and mouse hover coordinates.
* **Helical Friction Ticks**: Microscopic click-ticks fire rapidly during active scrolling to emulate physical cap friction.
* **Vacuum Release Unsealing Hiss & Pop**: Screwing past the unsealing threshold (`0.15` - `0.22` scroll progress) triggers an audible white noise air hiss followed by a deep downward-sweeping pop.

### 4. Interactive Studio Configurator
* **Real-time WebGL Shaders**: Instantly swaps cap colors, changes the plastic finish roughness/clearcoat parameters dynamically, and updates the active formula serum tint under the translucent shell.
* **Color-Synced Vapor Cloud Release**: The unsealing mist particle engine (`emitVapor()`) shoots 32 additive blending particles, dynamically color-matched to the selected active formula serum color.

### 5. Luxury Gold Letterpress Embossing
* **Physics-Based Bump Mapping**: The procedural textured label uses a high-resolution canvas mapped as both `map` and `bumpMap` (with `bumpScale: 0.012`) to physically indent the gold logo and typography, creating realistic highlights as lighting rotates.

---

## 🛠️ Technology Stack

* **Rendering Engine**: [Three.js](https://threejs.org/) (Custom WebGL Physical Materials)
* **Animation & Scroll Mechanics**: [GSAP](https://greensock.com/gsap/) & [ScrollTrigger](https://greensock.com/scrolltrigger/)
* **Audio Synthesizer**: Web Audio API (Zero external assets, entirely synthesized in-engine)
* **Core Languages**: Vanilla HTML5, CSS3, & Modern JavaScript (ES6)

---

## 📂 Project Structure

```bash
├── index.html            # Semantic overlay, sound controls, responsive sections
├── style.css             # Cinematic dark theme, vignette gradients, glassmorphism UI
├── app.js                # Three.js WebGL Engine, GSAP timelines, and procedural synthesizers
├── three.min.js          # Local Three.js dependency
├── gsap.min.js           # Local GSAP core animation library
├── ScrollTrigger.min.js  # Local ScrollTrigger plugin
└── README.md             # Project documentation
```

---

## 🚀 Getting Started & Local Serving

Due to browser security models (**CORS** constraints), WebGL applications rendering canvas-based textures must be run on a local server. Opening the `index.html` file directly (`file:///...`) will prevent the Three.js canvas from compiling textures correctly.

### Launch a Local Server Instantly:

#### Option A: Node.js (Recommended)
If you have Node.js installed, run:
```bash
npx serve
```
Then open `http://localhost:3000` in your browser.

#### Option B: Python
If you have Python installed, run:
```bash
# Python 3
python -m http.server 5000

# Python 2
python -m SimpleHTTPServer 5000
```
Then navigate to `http://localhost:5000`.

#### Option C: VS Code Extension
Install the **Live Server** extension in Visual Studio Code, open the repository folder, and click **Go Live** in the status bar.

---

## 🎓 Narrative Scrolling Structure

1. **Hero Screen**: Centered floating HDPE bottle with interactive mouse parallax lighting. Audio warning prompts let you enable the soundtrack smoothly.
2. **Unsealing Room**: Cap unscrews along mathematical helical paths. Vapor mist pops from the mouth matching the core formula tint.
3. **Studio Configurator**: Interactive B2B configuration room with real-time cap colors, finish options, and liquid hues.
4. **Engineering Specs**: 3D bottle tilts forward to `90°` exposing the recycle logo embossed base (`♴` HDPE code 2) while technical cards overlay.
5. **Inquiry Suite**: Soft background float with forms to contact a materials lab consultant, capping the bottle shut perfectly.

/* --------------------------------------------------
   DURAMAX - ADVANCED INTERACTIVE 3D ENGINE
   -------------------------------------------------- */

// Register GSAP ScrollTrigger Plugin
gsap.registerPlugin(ScrollTrigger);

// Global Application State
const state = {
    capColor: '#FFFFFF',
    liquidColor: '#EAA63D',
    bottleFinish: 'glossy', // frosted, glossy, matte
    isMobile: window.innerWidth <= 1024,
    scrollProgress: 0,
    audioActive: false
};

// DOM Elements
const webglContainer = document.getElementById('webgl-container');
const capNameLabel = document.getElementById('cap-name');
const liquidNameLabel = document.getElementById('liquid-name');
const capDots = document.querySelectorAll('#cap-options .color-dot');
const liquidDots = document.querySelectorAll('#liquid-options .color-dot');
const materialPills = document.querySelectorAll('.material-options .btn-pill');
const progressBar = document.getElementById('progress-bar');
const audioToggleBtn = document.getElementById('audio-toggle');
const audioAlertToast = document.getElementById('audio-alert');
const closeAudioAlertBtn = document.getElementById('close-audio-alert');

// Three.js Core Variables
let scene, camera, renderer;
let bottleGroup, innerBottleGroup, bottleMesh, capGroup, helicalThreadMesh, liquidMesh;
let lights = {};
let scrollTimeline = null;
let breathingAnimation = null;

// Custom Canvas Label Texture (Avoids CORS issues while remaining extremely sharp)
function createProceduralLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Off-white Luxury Paper Background
    ctx.fillStyle = '#f6f5f1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle natural paper tooth/grain filter (procedural)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    for (let i = 0; i < canvas.width; i += 4) {
        for (let j = 0; j < canvas.height; j += 4) {
            if (Math.random() > 0.5) {
                ctx.fillRect(i, j, 2, 2);
            }
        }
    }

    // 2. Subtle Luxury Gold Border/Margins
    ctx.strokeStyle = '#e2a05e';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Very thin elegant inner border
    ctx.strokeStyle = 'rgba(226, 160, 94, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // 3. Text Styling - Brand Name
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "DURAMAX" Logo - High-End Luxury Serif
    ctx.fillStyle = '#0b0d10';
    ctx.font = 'bold 80px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('DURAMAX', canvas.width / 2, 170);

    // Satin Gold Elegant Divider Line
    ctx.strokeStyle = '#e2a05e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 140, 230);
    ctx.lineTo(canvas.width / 2 + 140, 230);
    ctx.stroke();

    // 4. Subtitles & Specifications
    ctx.fillStyle = '#4c5565';
    ctx.font = '600 20px "Outfit", sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillText('PREMIUM ECO-LUXE PACKAGING', canvas.width / 2, 270);

    ctx.fillStyle = '#8a94a6';
    ctx.font = '400 15px "Outfit", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('HIGH-DENSITY RESINS  |  CIRCULAR SYSTEM CODE 02', canvas.width / 2, 310);

    // 5. Minimalist Recycling Icon and Details (Left & Right alignment)
    ctx.fillStyle = '#e2a05e';
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillText('♴', canvas.width / 2, 370); // HDPE code 2 symbol

    ctx.fillStyle = '#0b0d10';
    ctx.font = '600 13px "Outfit", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('HDPE GRADE NO. 2', canvas.width / 2, 410);

    ctx.font = '400 13px "Outfit", sans-serif';
    ctx.fillStyle = '#8a94a6';
    ctx.fillText('200ML  •  6.76 FL OZ', canvas.width / 2, 440);

    // Generate Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

// Procedural Audio Engine via Web Audio API (Zero asset latency)
const AudioEngine = {
    ctx: null,
    ambientSynth: null,
    ambientGain: null,
    unmuted: false,
    popTriggered: false,
    lastClickProgress: 0,
    
    startAmbient() {
        if (!this.unmuted) return;
        if (this.ctx) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Low frequency warm cinematic pad oscillators
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            this.ambientGain = this.ctx.createGain();
            const lowpass = this.ctx.createBiquadFilter();
            
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(110, this.ctx.currentTime); // A2 note
            osc2.detune.setValueAtTime(6, this.ctx.currentTime); // Rich stereo detuning
            
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(250, this.ctx.currentTime);
            lowpass.Q.setValueAtTime(1.5, this.ctx.currentTime);
            
            this.ambientGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
            
            osc1.connect(lowpass);
            osc2.connect(lowpass);
            lowpass.connect(this.ambientGain);
            this.ambientGain.connect(this.ctx.destination);
            
            osc1.start();
            osc2.start();
            
            // Fade in ambient music smoothly
            this.ambientGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 1.5);
        } catch (e) {
            console.warn("Web Audio API failed to load", e);
        }
    },
    
    updateAmbientPitch(scrollProgress, mouseX) {
        if (!this.ctx || !this.unmuted || !this.ambientGain) return;
        
        // Dynamically adjust synthesizer characteristics on scroll and hover
        const freqShift = 55 + (scrollProgress * 30) + (Math.abs(mouseX) * 15);
        this.ambientGain.gain.setValueAtTime(0.35 + (scrollProgress * 0.15), this.ctx.currentTime);
    },
    
    triggerPop() {
        if (!this.ctx || !this.unmuted) return;
        
        // 1. Synthesize air vacuum hiss using white noise
        const bufferSize = this.ctx.sampleRate * 0.3; // 300ms
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1500, this.ctx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.25);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
        
        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        // 2. Synthesize deep suction pop using downward frequency sine sweeps
        const popOsc = this.ctx.createOscillator();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
        popOsc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.12);
        
        const popGain = this.ctx.createGain();
        popGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
        popGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        
        popOsc.connect(popGain);
        popGain.connect(this.ctx.destination);
        
        whiteNoise.start();
        popOsc.start();
        whiteNoise.stop(this.ctx.currentTime + 0.3);
        popOsc.stop(this.ctx.currentTime + 0.16);
    },
    
    triggerClick() {
        if (!this.ctx || !this.unmuted) return;
        
        // Synthesize microscopic thread slide friction clicking
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(2200 + Math.random() * 800, this.ctx.currentTime);
        
        clickGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.012);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        
        clickOsc.start();
        clickOsc.stop(this.ctx.currentTime + 0.015);
    },
    
    mute() {
        this.unmuted = false;
        if (this.ambientGain && this.ctx) {
            this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
    },
    
    unmute() {
        this.unmuted = true;
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            if (this.ambientGain) {
                this.ambientGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            }
        } else {
            this.startAmbient();
        }
    }
};

// Initialize Three.js Engine
function initEngine() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#050608');
    scene.fog = new THREE.FogExp2('#050608', 0.06);
    scene.add(particleGroup);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.4, 9.5);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor('#050608', 1.0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    webglContainer.appendChild(renderer.domElement);

    // 4. Lighting Rig (Premium Commercial Studio Rig)
    // Ambient Light
    lights.ambient = new THREE.AmbientLight('#ffffff', 0.38);
    scene.add(lights.ambient);

    // Key Light (Main soft directional highlight)
    lights.key = new THREE.DirectionalLight('#ffffff', 1.6);
    lights.key.position.set(6, 8, 4);
    lights.key.castShadow = true;
    lights.key.shadow.mapSize.width = 2048;
    lights.key.shadow.mapSize.height = 2048;
    lights.key.shadow.bias = -0.0004;
    scene.add(lights.key);

    // Soft Blue Fill Light (Contrasts key shadowing)
    lights.fill = new THREE.DirectionalLight('#92aaff', 0.5);
    lights.fill.position.set(-6, 2, 4);
    scene.add(lights.fill);

    // Intense Golden Rim Light (Slices plastic curves, creating a halo profile)
    lights.rim = new THREE.DirectionalLight('#e2a05e', 3.6);
    lights.rim.position.set(0, 5, -8);
    scene.add(lights.rim);

    // Downward warm spotlight highlighting the base
    lights.spot = new THREE.SpotLight('#e2a05e', 2.0, 15, Math.PI/6, 0.5, 1);
    lights.spot.position.set(0, 8, 0);
    scene.add(lights.spot);

    // Ambient floating backdrop grid
    const gridHelper = new THREE.GridHelper(30, 32, 'rgba(226, 160, 94, 0.05)', 'rgba(255, 255, 255, 0.008)');
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // Build the beautiful geometric models
    buildBottle();

    // Event Bindings
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);
    initInteractiveConfigurator();
    initAudioController();
}

// Procedural Vapor/Mist Particle Release Physics
let particles = [];
const particleGroup = new THREE.Group();

function emitVapor() {
    // Generate an burst of 32 fine expanding particles
    const particleCount = 32;
    const particleGeo = new THREE.SphereGeometry(0.05, 8, 8);
    
    for (let i = 0; i < particleCount; i++) {
        // Glowing color-synced tinted basic material with transparency
        const particleMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(state.liquidColor),
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });
        
        const mesh = new THREE.Mesh(particleGeo, particleMat);
        mesh.position.set(0, 3.8, 0); // Position exactly at mouth neck rim
        
        // Soft outward expand velocity vectors
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.15;
        const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.random() * 2.0 + 1.2, // Launching high upwards
            Math.sin(angle) * speed
        );
        
        particleGroup.add(mesh);
        particles.push({
            mesh: mesh,
            velocity: velocity,
            life: 1.0,
            decay: 0.012 + Math.random() * 0.015,
            scaleSpeed: 1.035 + Math.random() * 0.02
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.addScaledVector(p.velocity, 0.016);
        p.mesh.scale.multiplyScalar(p.scaleSpeed);
        p.life -= p.decay;
        p.mesh.material.opacity = p.life * 0.7;
        
        if (p.life <= 0) {
            particleGroup.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            particles.splice(i, 1);
        }
    }
}

// Procedural 3D Geometry and Advanced Material Builders
function buildBottle() {
    bottleGroup = new THREE.Group();
    bottleGroup.position.set(0, state.isMobile ? -1.85 : -0.7, 0); // Ground bottle center nicely
    bottleGroup.scale.setScalar(state.isMobile ? 0.72 : 1.0); // Perfect mobile scale
    scene.add(bottleGroup);

    innerBottleGroup = new THREE.Group();
    bottleGroup.add(innerBottleGroup);

    // --- BOTTLE BODY FINISH SPECIFICATIONS ---
    const materialProfiles = {
        frosted: {
            color: '#f5f6f8',
            roughness: 0.28,
            metalness: 0.05,
            clearcoat: 0.35,
            clearcoatRoughness: 0.2,
            opacity: 0.88 // Set to premium high opacity by default to match Alabaster reference
        },
        glossy: {
            color: '#ffffff',
            roughness: 0.08,
            metalness: 0.08,
            clearcoat: 0.65,
            clearcoatRoughness: 0.1,
            opacity: 0.95 // Set to premium high opacity by default to match Alabaster reference
        },
        matte: {
            color: '#121214',
            roughness: 0.88,
            metalness: 0.1,
            clearcoat: 0.0,
            clearcoatRoughness: 0.0,
            opacity: 0.98 // Opaque black for obsidian matte
        }
    };

    const currentProfile = materialProfiles[state.bottleFinish];

    // 1. Premium HDPE Translucent Plastic Material (Highly robust, visible in any browser)
    const hdpeMaterial = new THREE.MeshPhysicalMaterial({
        color: currentProfile.color,
        roughness: currentProfile.roughness,
        metalness: currentProfile.metalness,
        clearcoat: currentProfile.clearcoat,
        clearcoatRoughness: currentProfile.clearcoatRoughness,
        transparent: true,
        opacity: currentProfile.opacity,
        side: THREE.DoubleSide,
        shadowSide: THREE.DoubleSide
    });

    // 2. Cap Material (Premium Satin Metal/Synthetic Shell)
    const capMaterial = new THREE.MeshPhysicalMaterial({
        color: state.capColor,
        roughness: 0.22,
        metalness: 0.1,
        clearcoat: 0.2,
        clearcoatRoughness: 0.18,
        side: THREE.DoubleSide
    });

    // 3. Label Material (Luxury Textured Cotton Paper with Procedural Gold Border)
    const labelTexture = createProceduralLabelTexture();
    const labelMaterial = new THREE.MeshStandardMaterial({
        map: labelTexture,
        bumpMap: labelTexture,
        bumpScale: 0.012, // High-end letterpress embossing depth
        roughness: 0.85,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    // 4. Refractive Dynamic Liquid Material
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
        color: state.liquidColor,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide
    });

    // --- BOTTLE MESH CONSTRUCTIONS ---

    // A. Dual-Walled Curved Body silhouette via LatheGeometry (Upward-only non-intersecting silhouette)
    const points = [];
    const width = 1.35; // RADIUS

    points.push(new THREE.Vector2(0, 0));                 // Center base
    points.push(new THREE.Vector2(width - 0.15, 0));       // Base rounded corner
    points.push(new THREE.Vector2(width, 0.15));          // Base corner curve
    points.push(new THREE.Vector2(width, 2.5));           // Smooth straight body cylinder
    points.push(new THREE.Vector2(width - 0.08, 2.85));    // Shoulder curve start
    points.push(new THREE.Vector2(0.85, 3.25));           // Neck base
    points.push(new THREE.Vector2(0.85, 3.9));            // Threaded outer neck mouth opening (Neck is open, no cap face!)

    const latheGeometry = new THREE.LatheGeometry(points, 64);
    bottleMesh = new THREE.Mesh(latheGeometry, hdpeMaterial);
    bottleMesh.castShadow = true;
    bottleMesh.receiveShadow = true;
    bottleMesh.renderOrder = 2; // Render second to overlay liquid cleanly
    innerBottleGroup.add(bottleMesh);

    // B. Mathematical Helical Neck Threading (Parametric Helix extruded via TubeGeometry)
    const helixPoints = [];
    const helixTurns = 2.8;
    const helixRadius = 0.865;
    const startY = 3.32;
    const endY = 3.82;
    const segments = 120;
    
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2 * helixTurns;
        const x = Math.cos(t) * helixRadius;
        const z = Math.sin(t) * helixRadius;
        const y = startY + (i / segments) * (endY - startY);
        helixPoints.push(new THREE.Vector3(x, y, z));
    }
    
    const helixCurve = new THREE.CatmullRomCurve3(helixPoints);
    helicalThreadMesh = new THREE.Mesh(
        new THREE.TubeGeometry(helixCurve, 80, 0.032, 10, false),
        hdpeMaterial
    );
    helicalThreadMesh.castShadow = true;
    helicalThreadMesh.renderOrder = 2; // Match bottle render order
    innerBottleGroup.add(helicalThreadMesh);

    // C. Translucent Inner Liquid Core (Solid cylinder fitting inside bottle wall bounds)
    const liquidGeo = new THREE.CylinderGeometry(width - 0.1, width - 0.1, 2.7, 48, 1, false);
    liquidMesh = new THREE.Mesh(liquidGeo, liquidMaterial);
    liquidMesh.position.set(0, 1.45, 0); // Fills exactly up to shoulder (y: 0.1 to 2.8)
    liquidMesh.renderOrder = 1; // Render first so glass blends on top
    innerBottleGroup.add(liquidMesh);

    // D. Luxury Embossed Half-Wrap Label Mesh
    const labelHeight = 1.7;
    const labelRadius = width + 0.004; // Micro-offset to shield against Z-fighting clipping
    const labelGeo = new THREE.CylinderGeometry(labelRadius, labelRadius, labelHeight, 64, 1, true, -Math.PI / 2, Math.PI); // 180 degree face-wrap
    const labelMesh = new THREE.Mesh(labelGeo, labelMaterial);
    labelMesh.position.set(0, 1.35, 0);
    innerBottleGroup.add(labelMesh);

    // E. Heavy-Ribbed Sealing Cap Group Assembly
    capGroup = new THREE.Group();
    capGroup.position.set(0, 3.25, 0); // Fits down perfectly over neck threads!
    innerBottleGroup.add(capGroup);

    // Cap Cylinder Core
    const capHeight = 0.65;
    const capRadius = 0.945;
    const capCore = new THREE.Mesh(
        new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 64),
        capMaterial
    );
    capCore.position.y = capHeight / 2;
    capCore.castShadow = true;
    capCore.receiveShadow = true;
    capGroup.add(capCore);

    // Procedural Gripping Ribs (72 micro cylinders layered around perimeter)
    const ribCount = 72;
    const ribGeo = new THREE.CylinderGeometry(0.012, 0.012, capHeight - 0.03, 4);
    
    for (let i = 0; i < ribCount; i++) {
        const angle = (i / ribCount) * Math.PI * 2;
        const rib = new THREE.Mesh(ribGeo, capMaterial);
        rib.position.set(
            Math.cos(angle) * (capRadius + 0.003),
            capHeight / 2,
            Math.sin(angle) * (capRadius + 0.003)
        );
        rib.rotation.y = -angle;
        rib.castShadow = true;
        capGroup.add(rib);
    }
}

// Configurator Interactive Tab Handlers
function initInteractiveConfigurator() {
    // 1. Cap Color Shifts
    capDots.forEach(dot => {
        dot.addEventListener('click', () => {
            capDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');

            const color = dot.getAttribute('data-color');
            const name = dot.getAttribute('data-name');
            state.capColor = color;
            capNameLabel.textContent = name;

            capGroup.traverse(child => {
                if (child.isMesh) {
                    gsap.to(child.material.color, {
                        r: new THREE.Color(color).r,
                        g: new THREE.Color(color).g,
                        b: new THREE.Color(color).b,
                        duration: 0.6,
                        ease: 'power2.out'
                    });
                }
            });
            
            // Synthesize short physical customizer confirmation sound
            AudioEngine.triggerClick();
        });
    });

    // 2. Liquid Active Formula Tint Shifts
    liquidDots.forEach(dot => {
        dot.addEventListener('click', () => {
            liquidDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');

            const color = dot.getAttribute('data-color');
            const name = dot.getAttribute('data-name');
            state.liquidColor = color;
            liquidNameLabel.textContent = name;

            gsap.to(liquidMesh.material.color, {
                r: new THREE.Color(color).r,
                g: new THREE.Color(color).g,
                b: new THREE.Color(color).b,
                duration: 0.8,
                ease: 'power2.out'
            });
            
            AudioEngine.triggerClick();
        });
    });

    // 3. Bottle Finish Toggles (Opal, Gloss, Matte Obsidian)
    materialPills.forEach(pill => {
        pill.addEventListener('click', () => {
            materialPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const finish = pill.getAttribute('data-finish');
            state.bottleFinish = finish;

            // Rebuild/rebind plastic physical properties in real time
            const materialProfiles = {
                frosted: { color: '#f5f6f8', roughness: 0.28, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.2, opacity: 0.88 },
                glossy: { color: '#ffffff', roughness: 0.08, metalness: 0.08, clearcoat: 0.65, clearcoatRoughness: 0.1, opacity: 0.95 },
                matte: { color: '#121214', roughness: 0.88, metalness: 0.1, clearcoat: 0.0, clearcoatRoughness: 0.0, opacity: 0.98 }
            };

            const profile = materialProfiles[finish];
            
            gsap.to(bottleMesh.material, {
                roughness: profile.roughness,
                metalness: profile.metalness,
                clearcoat: profile.clearcoat,
                clearcoatRoughness: profile.clearcoatRoughness,
                opacity: profile.opacity,
                duration: 0.7,
                ease: 'power2.out'
            });

            gsap.to(bottleMesh.material.color, {
                r: new THREE.Color(profile.color).r,
                g: new THREE.Color(profile.color).g,
                b: new THREE.Color(profile.color).b,
                duration: 0.7
            });

            gsap.to(helicalThreadMesh.material, {
                roughness: profile.roughness,
                metalness: profile.metalness,
                clearcoat: profile.clearcoat,
                clearcoatRoughness: profile.clearcoatRoughness,
                opacity: profile.opacity,
                duration: 0.7
            });

            gsap.to(helicalThreadMesh.material.color, {
                r: new THREE.Color(profile.color).r,
                g: new THREE.Color(profile.color).g,
                b: new THREE.Color(profile.color).b,
                duration: 0.7
            });

            AudioEngine.triggerClick();
        });
    });
}

// Procedural Audio Mute Toggle Button Mechanics
function initAudioController() {
    audioToggleBtn.addEventListener('click', () => {
        if (state.audioActive) {
            AudioEngine.mute();
            state.audioActive = false;
            audioToggleBtn.classList.remove('btn-active');
            audioToggleBtn.classList.add('btn-muted');
            document.querySelector('.audio-btn-label').textContent = 'Sound Off';
        } else {
            AudioEngine.unmute();
            state.audioActive = true;
            audioToggleBtn.classList.remove('btn-muted');
            audioToggleBtn.classList.add('btn-active');
            document.querySelector('.audio-btn-label').textContent = 'Sound On';
            
            // Show alert toast
            audioAlertToast.classList.remove('hide');
            setTimeout(() => {
                audioAlertToast.classList.add('hide');
            }, 6000);
        }
    });

    closeAudioAlertBtn.addEventListener('click', () => {
        audioAlertToast.classList.add('hide');
    });

    // Automatically trigger mute release warning prompt on first scrolling if still muted
    ScrollTrigger.create({
        trigger: "#scroll-wrapper",
        start: "top top",
        once: true,
        onEnter: () => {
            if (!state.audioActive) {
                // Glow alert button to invite user interaction
                audioToggleBtn.style.animation = 'alert-pulse 1s 3 alternate';
            }
        }
    });
}

// Device Viewport Resize Adaptations
function onWindowResize() {
    const wasMobile = state.isMobile;
    state.isMobile = window.innerWidth <= 1024;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // If mobile state toggled, dynamically adjust positions/scales and rebuild timelines
    if (wasMobile !== state.isMobile) {
        if (bottleGroup) {
            bottleGroup.position.set(0, state.isMobile ? -1.85 : -0.7, 0);
            bottleGroup.scale.setScalar(state.isMobile ? 0.72 : 1.0);
        }
        setupScrollTimelines();
    }
}

// Desktop Mouse Parallax Values
let targetRotationX = 0;
let targetRotationY = 0;

function onMouseMove(event) {
    // Only apply mouse parallax during hero stage to prevent layouts snapping later
    if (state.scrollProgress < 0.15) {
        const mouseX = (event.clientX / window.innerWidth) - 0.5;
        const mouseY = (event.clientY / window.innerHeight) - 0.5;
        
        targetRotationY = mouseX * 0.45;
        targetRotationX = mouseY * 0.35;
    }
}

// Complete GSAP Cinematic Multi-Shot Camera Scroll Timelines
function setupScrollTimelines() {
    // Kill old scroll timeline and its ScrollTrigger if it exists
    if (scrollTimeline) {
        if (scrollTimeline.scrollTrigger) {
            scrollTimeline.scrollTrigger.kill();
        }
        scrollTimeline.kill();
    }
    
    // Kill old breathing animation if it exists to prevent duplicate animation loops
    if (breathingAnimation) {
        breathingAnimation.kill();
    }

    // Elegant, constant breathing float idle oscillation
    breathingAnimation = gsap.to(innerBottleGroup.position, {
        y: '-=0.15',
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
    });

    const xPosRight = 1.95;
    const xPosLeft = -1.95;

    // GSAP ScrollTrigger timeline locking physical space transformations
    scrollTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#scroll-wrapper",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5,
            onUpdate: (self) => {
                state.scrollProgress = self.progress;
                progressBar.style.width = `${self.progress * 100}%`;
                
                // Audio synthesis hooks for active scrolling
                AudioEngine.updateAmbientPitch(self.progress, targetRotationY);
                
                const delta = Math.abs(self.progress - AudioEngine.lastClickProgress);
                // Trigger rapid micro click ticks as cap screws/unscrews on scroll
                if (delta > 0.005) {
                    AudioEngine.triggerClick();
                    AudioEngine.lastClickProgress = self.progress;
                }
                
                // Track exact unsealing puff threshold on scroll down
                if (self.progress > 0.15 && self.progress < 0.22) {
                    if (!AudioEngine.popTriggered) {
                        AudioEngine.triggerPop();
                        emitVapor();
                        AudioEngine.popTriggered = true;
                    }
                } else if (self.progress < 0.1) {
                    // Reset vacuum pop toggle so it can trigger again on backscroll up
                    AudioEngine.popTriggered = false;
                }
            }
        }
    });

    scrollTimeline
        // --- TIMELINE STEP 1: HERO TO UNSEALING ---
        .to(bottleGroup.position, {
            x: state.isMobile ? 0 : xPosRight,
            y: state.isMobile ? 1.45 : -1.0,
            z: state.isMobile ? -0.3 : 0.2,
            duration: 2
        }, 0)
        .to(bottleGroup.rotation, {
            y: Math.PI * 2.3, // Turns the gold embossed logo beautifully away, exposing thread details
            x: 0.12,
            z: 0.05,
            duration: 2
        }, 0)
        // UNSCREWING THE CAP VIA EXACT SPIRAL RATIOS
        .to(capGroup.position, {
            y: 5.8, // Elevates the cap straight up, exposing unsealed neck
            duration: 2,
            ease: "power1.inOut"
        }, 0)
        .to(capGroup.rotation, {
            y: -Math.PI * 6.5, // 3.25 full counter-clockwise unscrewing rotations
            duration: 2,
            ease: "power1.inOut"
        }, 0)

        // --- TIMELINE STEP 2: FEATURES TO CUSTOMIZER PANEL ---
        .to(bottleGroup.position, {
            x: state.isMobile ? 0 : xPosLeft,
            y: state.isMobile ? 1.55 : -0.75,
            z: state.isMobile ? 0.2 : 0.9, // Zooms forward
            duration: 2
        }, 2)
        .to(bottleGroup.rotation, {
            y: -Math.PI * 1.55,
            x: -0.05,
            z: -0.06,
            duration: 2
        }, 2)
        .to(capGroup.position, {
            y: 5.2, // Rests floats nearby in customizer frame
            z: 0.4,
            duration: 2
        }, 2)

        // --- TIMELINE STEP 3: CUSTOMIZER TO SPECIFICATION GRIDS ---
        .to(bottleGroup.position, {
            x: 0,
            y: state.isMobile ? 1.75 : 0.65,
            z: state.isMobile ? 0.8 : 1.6, // Extreme zoom in highlighting base recycled embossing
            duration: 2
        }, 4)
        .to(bottleGroup.rotation, {
            x: Math.PI * 0.45, // Heavy tilt forward exposing the detailed bottom structure
            y: Math.PI * 2.5,
            z: 0,
            duration: 2
        }, 4)
        .to(capGroup.position, {
            y: 9.0, // Throw cap completely out of camera frames
            z: -3.0,
            duration: 2
        }, 4)

        // --- TIMELINE STEP 4: SPECS TO INQUIRY SECTION & FOOTER ---
        .to(bottleGroup.position, {
            x: state.isMobile ? 0 : -2.0,
            y: state.isMobile ? 0.8 : -1.25,
            z: -0.8, // Pushes into soft ambient background
            duration: 2
        }, 6)
        .to(bottleGroup.rotation, {
            x: 0.05,
            y: Math.PI * 4.0, // Smoothly returns logo center-facing camera
            z: 0.02,
            duration: 2
        }, 6)
        .to(capGroup.position, {
            y: 3.25, // Caps screws back down perfectly to fully closed!
            z: 0,
            duration: 2
        }, 6)
        .to(capGroup.rotation, {
            y: 0, // Returns to flat locked thread rotation
            duration: 2
        }, 6);
}

// Dynamic Sloshing fluid math variables
let lastScrollProgress = 0;
let targetLiquidRotX = 0;
let targetLiquidRotZ = 0;

// High Performance Engine Frame Loop
function animate() {
    requestAnimationFrame(animate);

    // Apply inertia mouse parallax during hero screen
    if (state.scrollProgress < 0.15) {
        bottleGroup.rotation.y += (targetRotationY - bottleGroup.rotation.y) * 0.08;
        bottleGroup.rotation.x += (targetRotationX - bottleGroup.rotation.x) * 0.08;
    }

    // Dynamic sloshing liquid core tilt
    const scrollDelta = Math.abs(state.scrollProgress - lastScrollProgress);
    targetLiquidRotX = (scrollDelta * 2.5) + (targetRotationX * 0.12);
    targetLiquidRotZ = targetRotationY * 0.12;

    if (liquidMesh) {
        liquidMesh.rotation.x += (targetLiquidRotX - liquidMesh.rotation.x) * 0.08;
        liquidMesh.rotation.z += (targetLiquidRotZ - liquidMesh.rotation.z) * 0.08;
    }

    lastScrollProgress = state.scrollProgress;

    // Update vapor mist mechanics
    updateParticles();

    renderer.render(scene, camera);
}

// Initial Entry Mount
function startApp() {
    initEngine();
    setupScrollTimelines();
    animate();

    // Elegant entrance graphics
    gsap.from(".main-header", { y: -60, opacity: 0, duration: 1.2, ease: "power4.out" });
    gsap.from(".hero-text-content", { x: -100, opacity: 0, duration: 1.5, delay: 0.2, ease: "power4.out" });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

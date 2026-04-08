// ATOMIC ORBITAL VISUALIZER
// PATCH FINAL
// 1. CÂMERA, CENA E CENÁRIO
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer com preserveDrawingBuffer para permitir tirar fotos e gravar vídeos
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
let currentPixelRatio = Math.min(window.devicePixelRatio, 2.0);
renderer.setPixelRatio(currentPixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 15;
controls.maxDistance = 150;
// Impede o usuário de arrastar o átomo para fora do centro da tela
controls.enablePan = false; 

camera.position.z = 35;
camera.position.y = 8;

const gridSize = 500;
const gridDivisions = 100;
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00aaff, 0x111122);
gridHelper.position.y = -20; 
scene.add(gridHelper);

// 2. CONSTRUÇÃO E ESTRUTURA DO ÁTOMO
const atomGroup = new THREE.Group();
scene.add(atomGroup);

const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), nucleusMaterial);
atomGroup.add(nucleus);

const axisLength = 20.0; 
const matX = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6 });
const matY = new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 });
const matZ = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 });

const geoX = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0)]);
const geoY = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0)]);
const geoZ = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -axisLength), new THREE.Vector3(0, 0, axisLength)]);

atomGroup.add(new THREE.Line(geoX, matX));
atomGroup.add(new THREE.Line(geoY, matY));
atomGroup.add(new THREE.Line(geoZ, matZ));

function createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.font = "Bold 50px monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 3, 1); 
    return sprite;
}

const labelOffset = axisLength + 2.0;
atomGroup.add(createTextSprite("X", "#ff4444")).position.set(labelOffset, 0, 0);
atomGroup.add(createTextSprite("-X", "#aa3333")).position.set(-labelOffset, 0, 0);
atomGroup.add(createTextSprite("Y", "#44ff44")).position.set(0, labelOffset, 0);
atomGroup.add(createTextSprite("-Y", "#33aa33")).position.set(0, -labelOffset, 0);
atomGroup.add(createTextSprite("Z", "#4488ff")).position.set(0, 0, labelOffset);
atomGroup.add(createTextSprite("-Z", "#3355aa")).position.set(0, 0, -labelOffset);

// 3. OTIMIZAÇÃO: CARREGAMENTO ASYNC E WORKER
const MAX_PARTICLES = 10000000;
const particleGeometry = new THREE.BufferGeometry();
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const maxDistributionRadius = isMobile ? 30.0 : 35.0;

const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const loadingScreen = document.getElementById('loading-screen');

const worker = new Worker('worker.js');
worker.onmessage = function(e) {
    if (e.data.type === 'progress') {
        loadingBar.style.width = `${e.data.progress}%`;
        loadingText.innerText = `${Math.round(e.data.progress)}% (${e.data.count.toLocaleString()} partículas)`;
    }
    else if (e.data.type === 'done') {
        loadingBar.style.width = '100%';
        loadingText.innerText = `100% (${MAX_PARTICLES.toLocaleString()} partículas)`;
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(e.data.positions, 3));
        finishLoadingAndStart();
    }
};

worker.postMessage({
    maxParticles: MAX_PARTICLES,
    maxDistributionRadius: maxDistributionRadius
});

let particles;
let targetStarkE = 0.0;
let currentDrawCount = 100000;

const particleUniforms = {
    u_time: { value: 0.0 },
    u_n: { value: 1.0 }, u_l: { value: 0.0 }, u_m: { value: 0.0 },
    u_n2: { value: 1.0 }, u_l2: { value: 0.0 }, u_m2: { value: 0.0 },
    u_spin: { value: 1.0 },
    u_starkE: { value: 0.0},
    u_transition: { value: 0.0 },
    u_excitation: { value: 0.0 },
    u_pointSize: { value: isMobile ? 3.5 : 2.0 }
};

// Ajusta o tamanho da partícula para evitar Overdraw massivo em densidades altas
function applyOptimizations() {
    let densityRatio = currentDrawCount / MAX_PARTICLES; 
    let baseSize = isMobile ? 3.5 : 2.0;
    let newSize = baseSize - (densityRatio * (isMobile ? 2.5 : 1.0));
    particleUniforms.u_pointSize.value = Math.max(0.5, newSize);
}

function finishLoadingAndStart() {
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.style.display = 'none', 500);

    particleGeometry.setDrawRange(0, currentDrawCount);

    const particleMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader, 
        fragmentShader: fragmentShader,
        uniforms: particleUniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.frustumCulled = false;
    atomGroup.add(particles);

    applyOptimizations();

    const slider = document.getElementById('input-particles');
    slider.value = currentDrawCount / 100000;
    document.getElementById('val-particles').innerText = (slider.value * 0.1).toFixed(1);

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 4. ENGINE DE ANIMAÇÃO COM FPS ADAPTATIVO
const clock = new THREE.Clock();
let lastFrameTime = performance.now();
let frameDropsCount = 0;
let isTransitioning = false;
let transitionProgress = 0.0;
const transitionDuration = 2.0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Tempo isolado de FPS para evitar "pulos" de frame
    const frameTime = Math.min(deltaTime / 1000, 1/30); 
    particleUniforms.u_time.value += frameTime;
    
    const lerpFactor = 1.0 - Math.pow(0.001, frameTime); 
    particleUniforms.u_starkE.value += (targetStarkE - particleUniforms.u_starkE.value) * lerpFactor;

    // LÓGICA DE SUPERPOSIÇÃO E EXCITAÇÃO
    if (isTransitioning) {
        transitionProgress += frameTime / transitionDuration;
        
        if (transitionProgress >= 1.0) {
            isTransitioning = false;
            transitionProgress = 1.0;
            
            particleUniforms.u_n.value = particleUniforms.u_n2.value;
            particleUniforms.u_l.value = particleUniforms.u_l2.value;
            particleUniforms.u_m.value = particleUniforms.u_m2.value;
            particleUniforms.u_transition.value = 0.0; 
            particleUniforms.u_excitation.value = 0.0; 
        } else {
            let t = transitionProgress;
            particleUniforms.u_transition.value = t * t * (3.0 - 2.0 * t);
            particleUniforms.u_excitation.value = 4.0 * t * (1.0 - t);
        }
    }

    // GERENCIADOR DE CRISE (Reduz Pixel Ratio e Partículas se o hardware chorar)
    if (deltaTime > 50) { 
        frameDropsCount++;
        if (frameDropsCount > 10) {
            if (currentPixelRatio > 0.6) {
                currentPixelRatio -= 0.2; 
                renderer.setPixelRatio(currentPixelRatio);
                frameDropsCount = -15; 
            } else if (currentDrawCount > 100000) {
                currentDrawCount = Math.max(100000, currentDrawCount - 200000); 
                particleGeometry.setDrawRange(0, currentDrawCount);
                
                const slider = document.getElementById('input-particles');
                slider.value = currentDrawCount / 100000;
                document.getElementById('val-particles').innerText = (currentDrawCount / 1000000).toFixed(1);
                
                renderer.renderLists.dispose(); // Limpeza de memória forçada
                frameDropsCount = -20; 
            }
            applyOptimizations(); 
        }
    } else {
        frameDropsCount = Math.max(0, frameDropsCount - 5); 
    }

    atomGroup.rotation.y += 0.003; 
    controls.update();
    renderer.render(scene, camera);
}

// 5. LÓGICA DO PAINEL, UI E EXPORTAÇÃO
const panel = document.getElementById('quantum-panel');
const btnToggle = document.getElementById('toggle-panel');
const btnUpdate = document.getElementById('btn-update');
const errorMsg = document.getElementById('error-msg');
const starkSlider = document.getElementById('input-stark');
const starkLabel = document.getElementById('val-stark');

starkSlider.addEventListener('input', () => {
    const val_stark = parseFloat(starkSlider.value) * 0.1;
    starkLabel.innerText = val_stark.toFixed(1);
    targetStarkE = val_stark;
})

btnToggle.addEventListener('click', () => panel.classList.toggle('hidden'));

// Lógica do Modal de Ajuda
const helpModal = document.getElementById('help-modal');
document.getElementById('btn-help').addEventListener('click', () => helpModal.classList.remove('hidden'));
document.getElementById('close-help').addEventListener('click', () => helpModal.classList.add('hidden'));
helpModal.addEventListener('click', (event) => {
    if (event.target === helpModal) helpModal.classList.add('hidden');
});

// Exportar Imagem (Foto)
document.getElementById('btn-export-img').addEventListener('click', () => {
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `orbital_${particleUniforms.u_n.value}_${particleUniforms.u_l.value}_${particleUniforms.u_m.value}.png`;
    link.href = dataURL;
    link.click();
});

// Exportar Vídeo
let mediaRecorder;
let recordedChunks = [];
const btnVid = document.getElementById('btn-export-vid');
btnVid.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    } else {
        recordedChunks = [];
        const stream = renderer.domElement.captureStream(30);
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `orbital_video.webm`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            btnVid.classList.remove('recording');
            btnVid.innerText = "🎥 Gravar";
        };

        mediaRecorder.start();
        btnVid.classList.add('recording');
        btnVid.innerText = "🛑 Parar Gravação";
    }
});

window.updateMagOptions = function() {
    const currentL = parseInt(document.getElementById('input-l').value);
    const sliderM = document.getElementById('input-m');
    const valM = document.getElementById('val-m');

    sliderM.min = -currentL;
    sliderM.max = currentL;

    let currentM = parseInt(sliderM.value);
    if (currentM > currentL) sliderM.value = currentL;
    if (currentM < -currentL) sliderM.value = -currentL;

    valM.innerText = sliderM.value;
};

function getOrbitalName(n, l, m) {
    let name = `${n}`;
    if (l === 0) name += "s";
    else if (l === 1) {
        if (m === 0) name += "p<sub>z</sub>";
        else if (m === 1) name += "p<sub>x</sub>";
        else if (m === -1) name += "p<sub>y</sub>";
    }
    else if (l === 2) {
        if (m === 0) name += "d<sub>z²</sub>";
        else if (m === 1) name += "d<sub>xz</sub>";
        else if (m === -1) name += "d<sub>yz</sub>";
        else if (m === 2) name += "d<sub>x²-y²</sub>";
        else if (m === -2) name += "d<sub>xy</sub>";
    }
    else if (l === 3) {
        if (m === 0) name += "f<sub>z³</sub>";
        else if (m === 1) name += "f<sub>xz²</sub>";
        else if (m === -1) name += "f<sub>yz²</sub>";
        else if (m === 2) name += "f<sub>z(x²-y²)</sub>";
        else if (m === -2) name += "f<sub>xyz</sub>";
        else if (m === 3) name += "f<sub>x(x²-3y²)</sub>";
        else if (m === -3) name += "f<sub>y(3x²-y²)</sub>";
    }
    return name;
}

errorMsg.style.color = "#00ff88";
errorMsg.innerHTML = `Orbital Atual: 1s (Spin +1/2)`;
updateMagOptions(); 

btnUpdate.addEventListener('click', () => {
    const val_n = parseFloat(document.getElementById('input-n').value);
    const val_l = parseFloat(document.getElementById('input-l').value);
    const val_m = parseFloat(document.getElementById('input-m').value);
    const val_spin = parseFloat(document.getElementById('input-spin').value);
    const val_stark = parseFloat(document.getElementById('input-stark').value) * 0.1;
    
    const sliderValue = parseInt(document.getElementById('input-particles').value);
    const requestedParticles = sliderValue * 100000;

    if (val_l >= val_n) {
        errorMsg.style.color = "#ff3366";
        errorMsg.innerHTML = `Erro: 'l' deve ser menor que 'n'. (Max: ${val_n - 1})`;
        return;
    }

    if (requestedParticles !== currentDrawCount) {
        currentDrawCount = requestedParticles;
        particleGeometry.setDrawRange(0, currentDrawCount);
        applyOptimizations(); // Recalcula o tamanho se a densidade mudou
    }

    particleUniforms.u_spin.value = val_spin;
    particleUniforms.u_starkE.value = val_stark;

    if (particleUniforms.u_n.value !== val_n || 
        particleUniforms.u_l.value !== val_l || 
        particleUniforms.u_m.value !== val_m) {
        
        particleUniforms.u_n2.value = val_n;
        particleUniforms.u_l2.value = val_l;
        particleUniforms.u_m2.value = val_m;
        
        isTransitioning = true;
        transitionProgress = 0.0;
    }

    errorMsg.style.color = "#00ff88";
    let spinText = val_spin > 0 ? "+1/2" : "-1/2";
    let starkText = val_stark !== 0 ? ` | E = ${val_stark.toFixed(1)}` : "";
    errorMsg.innerHTML = `Orbital Atual: ${getOrbitalName(val_n, val_l, val_m)} (Spin ${spinText})${starkText}`;
});
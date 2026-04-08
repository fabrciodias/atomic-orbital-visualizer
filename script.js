//ATOMIC ORBITAL VISUALIZER
//EIXOS CARTESIANOS (X, Y e Z) + CENÁRIO + CARREGAMENTO ASYNC 

//1. Câmera, Cena e Cenário
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

camera.position.z = 35;
camera.position.y = 8;

const gridSize = 500;
const gridDivisions = 100;
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00aaff, 0x111122);
gridHelper.position.y = -20; 
scene.add(gridHelper);


//2. CONSTRUÇÃO E ESTRUTURA DO ÁTOMO
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
    canvas.width = 128;
    canvas.height = 128;
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
const labelX = createTextSprite("X", "#ff4444"); labelX.position.set(labelOffset, 0, 0); atomGroup.add(labelX);
const labelMinusX = createTextSprite("-X", "#aa3333"); labelMinusX.position.set(-labelOffset, 0, 0); atomGroup.add(labelMinusX);
const labelY = createTextSprite("Y", "#44ff44"); labelY.position.set(0, labelOffset, 0); atomGroup.add(labelY);
const labelMinusY = createTextSprite("-Y", "#33aa33"); labelMinusY.position.set(0, -labelOffset, 0); atomGroup.add(labelMinusY);
const labelZ = createTextSprite("Z", "#4488ff"); labelZ.position.set(0, 0, labelOffset); atomGroup.add(labelZ);
const labelMinusZ = createTextSprite("-Z", "#3355aa"); labelMinusZ.position.set(0, 0, -labelOffset); atomGroup.add(labelMinusZ);


//3. OTIMIZAÇÃO: CARREGAMENTO ASYNC
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const MAX_PARTICLES = 10000000;
const particleGeometry = new THREE.BufferGeometry();
const maxDistributionRadius = isMobile ? 25.0 : 35.0;

const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const loadingScreen = document.getElementById('loading-screen');

//Inicia o Worker
const worker = new Worker('worker.js');
worker.onmessage = function(e) {
    if (e.data.type === 'progress') {
        loadingBar.style.width = `${e.data.progress}%`;
        loadingText.innerText = `${Math.round(e.data.progress)}% (${e.data.count.toLocaleString()} partículas)`;
    }
    else if (e.data.type === 'done') {
        loadingBar.style.width = '100%';
        loadingText.innerText = `100% (${MAX_PARTICLES.toLocaleString()} partículas)`;

        //Recebe o sinal da memória RAM
        const positions = e.data.positions;

        //Passa a memória direto para a placa de vídeo
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        finishLoadingAndStart()
    }
};

worker.postMessage({
    maxParticles: MAX_PARTICLES,
    maxDistributionRadius: maxDistributionRadius
});

let particles;
let targetStarkE = 0.0;
let currentDrawCount = 100000;
let currentPixelRatio = Math.min(window.devicePixelRatio, 2.0);
const particleUniforms = {
    u_time: { value: 0.0 },
    u_n: { value: 1.0 },
    u_l: { value: 0.0 },
    u_m: { value: 0.0 },
    u_n2: { value: 1.0 },
    u_l2: { value: 0.0 },
    u_m2: { value: 0.0 },
    u_spin: { value: 1.0 },
    u_starkE: { value: 0.0},
    u_transition: { value: 0.0 },
    u_excitation: { value: 0.0 },
    u_pointSize: { value: 2.0 }
};

function applyOptimizations() {
    let densityRatio = currentDrawCount / MAX_PARTICLES;
    let baseSize = isMobile ? 3.5 : 2.0;
    let newSize = baseSize - (densityRatio * (isMobile ? 2.5 : 1.0));
    particleUniforms.u_pointSize.value + Math.max(0.5, newSize);
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
    renderer.setPixelRatio(currentPixelRatio);

    //TRAVA DE SINC DA UI
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

//4. ENGINE DE ANIMAÇÃO COM FPS ADAPTATIVO
const clock = new THREE.Clock();
let lastFrameTime = performance.now();
let frameDropsCount = 0;
let isTransitioning = false;
let transitionProgress = 0.0;
const transitionDuration = 2.0;

function cleanupMemory() {
    renderer.renderLists.dispose();
}

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    particleUniforms.u_starkE.value += (targetStarkE - particleUniforms.u_starkE.value) * 0.1;
    
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // LÓGICA DE SUPERPOSIÇÃO E EXCITAÇÃO (Elegante)
    if (isTransitioning) {
        transitionProgress += (deltaTime / 1000.0) / transitionDuration;
        
        if (transitionProgress >= 1.0) {
            //FIM DO PROCESSO
            isTransitioning = false;
            transitionProgress = 1.0;
            
            particleUniforms.u_n.value = particleUniforms.u_n2.value;
            particleUniforms.u_l.value = particleUniforms.u_l2.value;
            particleUniforms.u_m.value = particleUniforms.u_m2.value;
            particleUniforms.u_transition.value = 0.0; 
            particleUniforms.u_excitation.value = 0.0; 
        } else {
            //Animação da Forma
            let t = transitionProgress;
            let smoothT = t * t * (3.0 - 2.0 * t);
            particleUniforms.u_transition.value = smoothT;
            
            //Animação
            let surge = 4.0 * t * (1.0 - t);
            particleUniforms.u_excitation.value = surge;
        }
    }

    if (deltaTime > 45) { 
        frameDropsCount++;

        if (frameDropsCount > 12) {
            //Primeira defesa: ficar um pouco mais embaçado (pixel ratio)
            if (currentPixelRatio > 0.5) {
                currentPixelRatio -= 0.25;
                renderer.setPixelRatio(currentPixelRatio);
                frameDropsCount = -15;
                console.warn(`Lag: Resolução de renderização reduzida para ${currentPixelRatio}`);
            }
            // Segunda defesa: expulsar partículas
            else if (currentDrawCount > 100000) {
                currentDrawCount = Math.max(100000, currentDrawCount - 200000);
                particleGeometry.setDrawRange(0, currentDrawCount);
                cleanupMemory();

                const slider = document.getElementById('input-particles');
                slider.value = currentDrawCount / 100000;
                document.getElementById('val-particles').innerText = (slider.value * 0.1).toFixed(1);

                frameDropsCount = -60;
                console.warn(`Lag: Densidade reduzida par ${(currentDrawCount/100000).toFixed(1)}M`);
            }
            applyOptimizations();
        }
    } else {
        frameDropsCount = Math.max(0, frameDropsCount - 5); 
    }

    const frameTime = Math.min(deltaTime / 1000, 1/30);
    const lerpFactor = 1.0  - Math.pow(0.001, frameTime)
    particleUniforms.u_time.value += frameTime;
    particleUniforms.u_spin.value = val_spin;
    particleUniforms.u_starkE.value += (targetStarkE - particleUniforms.u_starkE.value) * lerpFactor;

    atomGroup.rotation.y += 0.003; 
    controls.update();
    renderer.render(scene, camera);
}

//5. LÓGICA DO PAINEL E CONTROLES
const panel = document.getElementById('quantum-panel');
const btnToggle = document.getElementById('toggle-panel');
const btnUpdate = document.getElementById('btn-update');
const errorMsg = document.getElementById('error-msg');
const selectM = document.getElementById('input-m');
const starkSlider = document.getElementById('input-stark');
const starkLabel = document.getElementById('val-stark');

starkSlider.addEventListener('input', () => {
    const val_stark = parseFloat(starkSlider.value) * 0.1;
    starkLabel.innerText = val_stark.toFixed(1);
    targetStarkE = val_stark;
})

btnToggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
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
    
    // Captura a força do Campo Elétrico (dividindo por 10 porque o slider vai de -10 a 10)
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
    }
    applyOptimizations();

    
    // Se a física nova for diferente da atual, iniciamos o balé quântico!
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

//6. Funcionalidades do Patch 2.0 (Ajuda e Exportação)
const helpModal = document.getElementById('help-modal');
const btnHelp = document.getElementById('btn-help');
const closeHelp = document.getElementById('close-help');

//abre a ajuda
btnHelp.addEventListener('click', ()=> {
    helpModal.classList.remove('hidden');
});

//fecha a janela clicando no 'X'
closeHelp.addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

//fecha a janela se clicar fora da caixa
helpModal.addEventListener('click', (event) => {
    if (event.target === helpModal) {
        helpModal.classList.add('hidden');
    }
});

//Tirar foto (PNG)
document.getElementById('btn-export-img').addEventListener('click', () => {
    renderer.render(scene, camera); // Força um frame limpo
    const dataURL = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `orbital_${particleUniforms.u_n.value}_${particleUniforms.u_l.value}_${particleUniforms.u_m.value}.png`;
    link.href = dataURL;
    link.click();
});
//Gravar vídeo (WebM)
let mediaRecorder;
let recordedChunks = [];
const btnVid = document.getElementById('btn-export-vid');

btnVid.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    } else {
        recordedChunks = [];
        const stream = renderer.domElement.captureStream(30); //30 FPS
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

            //Restaura o botão
            btnVid.classList.remove('recording');
            btnVid.innerText = "🎥 Gravar"
        };

        mediaRecorder.start();
        btnVid.classList.add('recording');
        btnVid.innerText = "🛑 Parar Gravação";
    }
});
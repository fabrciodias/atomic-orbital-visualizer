//QUANTUM VOLUMETRIC SIMULATOR
//OTIMIZAÇÃO (BUFFER POOLING) e GUIAS CARTESIANAS

//1. Câmera e Cena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

camera.position.z = 35;
camera.position.y = 8;

//2. Física (Shaders)
const vertexShader = `
    uniform float u_time;
    uniform float u_n; 
    uniform float u_l; 
    uniform float u_m; 
    uniform float u_spin;

    varying float v_opacity;
    varying float v_spin; 

    #define PI 3.1415926535897932384626433832795

    float SphericalHarmonic(float l, float m, vec3 pos, float r) {
        if (r < 0.0001) return 0.0;
        if (l == 0.0) return sqrt(1.0 / (4.0 * PI));

        if (l == 1.0) {
            if (m == 0.0) return sqrt(3.0 / (4.0 * PI)) * (pos.z / r); 
            if (m == 1.0) return sqrt(3.0 / (4.0 * PI)) * (pos.x / r); 
            if (m == -1.0) return sqrt(3.0 / (4.0 * PI)) * (pos.y / r); 
        }

        if (l == 2.0) {
            if (m == 0.0) return sqrt(5.0 / (16.0 * PI)) * (3.0 * (pos.z * pos.z / (r * r)) - 1.0); 
            if (m == 1.0) return sqrt(15.0 / (4.0 * PI)) * (pos.x * pos.z / (r * r)); 
            if (m == -1.0) return sqrt(15.0 / (4.0 * PI)) * (pos.y * pos.z / (r * r)); 
            if (m == 2.0) return sqrt(15.0 / (16.0 * PI)) * ((pos.x * pos.x - pos.y * pos.y) / (r * r)); 
            if (m == -2.0) return sqrt(15.0 / (4.0 * PI)) * (pos.x * pos.y / (r * r)); 
        }

        if (l == 3.0) {
            float z2 = pos.z * pos.z;
            float r2 = r * r;
            float x2y2 = pos.x * pos.x - pos.y * pos.y;

            if (m == 0.0) return sqrt(7.0 / (16.0 * PI)) * (pos.z / r) * (5.0 * (z2 / r2) - 3.0); 
            if (m == 1.0) return sqrt(21.0 / (32.0 * PI)) * (pos.x / r) * (5.0 * (z2 / r2) - 1.0); 
            if (m == -1.0) return sqrt(21.0 / (32.0 * PI)) * (pos.y / r) * (5.0 * (z2 / r2) - 1.0); 
            if (m == 2.0) return sqrt(105.0 / (16.0 * PI)) * (pos.z / r) * (x2y2 / r2); 
            if (m == -2.0) return sqrt(105.0 / (4.0 * PI)) * (pos.x * pos.y * pos.z) / (r * r * r); 
            if (m == 3.0) return sqrt(35.0 / (32.0 * PI)) * (pos.x / r) * ((pos.x * pos.x - 3.0 * pos.y * pos.y) / r2); 
            if (m == -3.0) return sqrt(35.0 / (32.0 * PI)) * (pos.y / r) * ((3.0 * pos.x * pos.x - pos.y * pos.y) / r2); 
        }
        return 0.0;
    }

    float RadialWaveFunction(float n, float l, float r) {
        if (n == 1.0 && l == 0.0) return 2.0 * exp(-r); 
        
        if (n == 2.0) {
            if (l == 0.0) return (1.0 / sqrt(2.0)) * (1.0 - 0.5 * r) * exp(-0.5 * r); 
            if (l == 1.0) return (1.0 / sqrt(24.0)) * r * exp(-0.5 * r); 
        }
        if (n == 3.0) {
            if (l == 0.0) return (2.0 / (81.0 * sqrt(3.0))) * (27.0 - 18.0 * r + 2.0 * r * r) * exp(-r / 3.0); 
            if (l == 1.0) return (4.0 / (81.0 * sqrt(6.0))) * (6.0 - r) * r * exp(-r / 3.0); 
            if (l == 2.0) return (4.0 / (81.0 * sqrt(30.0))) * (r * r) * exp(-r / 3.0); 
        }
        if (n == 4.0) {
            float r2 = r * r;
            float r3 = r2 * r;
            if (l == 0.0) return (1.0 / 4.0) * (1.0 - (3.0/4.0)*r + (1.0/8.0)*r2 - (1.0/192.0)*r3) * exp(-r / 4.0); 
            if (l == 1.0) return (sqrt(5.0) / (16.0 * sqrt(3.0))) * r * (1.0 - (1.0/4.0)*r + (1.0/80.0)*r2) * exp(-r / 4.0); 
            if (l == 2.0) return (1.0 / (64.0 * sqrt(5.0))) * r2 * (1.0 - (1.0/12.0)*r) * exp(-r / 4.0); 
            if (l == 3.0) return (1.0 / (768.0 * sqrt(35.0))) * r3 * exp(-r / 4.0); 
        }
        return 0.0;
    }

    void main() {
        vec3 finalPos = position;
        float r = length(finalPos);

        float R = RadialWaveFunction(u_n, u_l, r);
        float Y = SphericalHarmonic(u_l, u_m, finalPos, r);

        float probDensity = (R * R) * (Y * Y);
        float exposure = 100.0 * pow(u_n, 1.5);
        v_opacity = probDensity * exposure;
        v_spin = u_spin;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
        //gl_PointSize = 2.0; 
    }
`;

//Mantendo o tamanho dinâmico do ponto com base no dispositivo
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const vertexShaderFinal = vertexShader.replace("//gl_PointSize = 2.0;", `gl_PointSize = ${isMobile ? '3.5' : '2.0'};`);

const fragmentShader = `
    varying float v_opacity;
    varying float v_spin; 
    
    void main() {
        if (v_opacity < 0.001) discard;

        vec3 baseColor = (v_spin > 0.0) ? vec3(0.1, 0.6, 1.0) : vec3(1.0, 0.7, 0.2);
        vec3 coreColor = vec3(1.0, 1.0, 1.0);
        
        vec3 finalColor = mix(baseColor, coreColor, clamp(v_opacity - 1.0, 0.0, 1.0));

        gl_FragColor = vec4(finalColor, min(v_opacity, 1.0));
    }
`;

//3. CONSTRUÇÃO DO SISTEMA OTIMIZADO (BUFFER POOLING)
const MAX_PARTICLES = 10000000;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(MAX_PARTICLES * 3);

function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const maxDistributionRadius = 35.0; 
for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePositions[i * 3] = randn_bm() * (maxDistributionRadius / 3.0); 
    particlePositions[i * 3 + 1] = randn_bm() * (maxDistributionRadius / 3.0); 
    particlePositions[i * 3 + 2] = randn_bm() * (maxDistributionRadius / 3.0); 
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

//Renderiza apenas uma fração inicial (ex: 100k) para carga rápida
let currentDrawCount = 100000;
particleGeometry.setDrawRange(0, currentDrawCount);

const particleUniforms = {
    u_time: { value: 0.0 },
    u_n: { value: 1.0 },
    u_l: { value: 0.0 },
    u_m: { value: 0.0 },
    u_spin: { value: 1.0 }
};

const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShaderFinal,
    fragmentShader: fragmentShader,
    uniforms: particleUniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
particles.frustumCulled = false;

//Crinado grupo do átomo
const atomGroup = new THREE.Group();
scene.add(atomGroup);

atomGroup.add(particles);

//nucleo simbolico
const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), nucleusMaterial);
atomGroup.add(nucleus);

//GUIAS CARTESIANAS (Eixos Simétricos com Letras)
const axisLength = 20.0; //O tamanho que você escolheu

//Materiais com as cores padrão (RGB = XYZ)
const matX = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6 });
const matY = new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 });
const matZ = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 });

//Criando as linhas cruzando do negativo ao positivo
const geoX = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0)]);
const geoY = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0)]);
const geoZ = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -axisLength), new THREE.Vector3(0, 0, axisLength)]);

atomGroup.add(new THREE.Line(geoX, matX));
atomGroup.add(new THREE.Line(geoY, matY));
atomGroup.add(new THREE.Line(geoZ, matZ));

//Função para criar Letras (Sprites 2D renderizados no 3D)
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
    //depthTest: false garante que a letra sempre apareça por cima da nuvem quântica
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 3, 1); //Tamanho da letra no espaço 3D
    return sprite;
}

//Adicionando as letras nas pontas (um pouco além da linha, posição 22)
const labelOffset = axisLength + 2.0;

//Eixo X (Vermelho)
const labelX = createTextSprite("X", "#ff4444");
labelX.position.set(labelOffset, 0, 0);
atomGroup.add(labelX);

const labelMinusX = createTextSprite("-X", "#aa3333"); //Cor mais escura pro negativo
labelMinusX.position.set(-labelOffset, 0, 0);
atomGroup.add(labelMinusX);

//Eixo Y (Verde)
const labelY = createTextSprite("Y", "#44ff44");
labelY.position.set(0, labelOffset, 0);
atomGroup.add(labelY);

const labelMinusY = createTextSprite("-Y", "#33aa33");
labelMinusY.position.set(0, -labelOffset, 0);
atomGroup.add(labelMinusY);

//Eixo Z (Azul)
const labelZ = createTextSprite("Z", "#4488ff");
labelZ.position.set(0, 0, labelOffset);
atomGroup.add(labelZ);

const labelMinusZ = createTextSprite("-Z", "#3355aa");
labelMinusZ.position.set(0, 0, -labelOffset);
atomGroup.add(labelMinusZ);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

//4. ENGINE DE ANIMAÇÃO COM FPS ADAPTATIVO
const clock = new THREE.Clock();
let lastFrameTime = performance.now();
let frameDropsCount = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    //Monitor de Performance (Thermal Throttling dinâmico)
    if (deltaTime > 45) { //Caiu de ~22 FPS
        frameDropsCount++;
        if (frameDropsCount > 10 && currentDrawCount > 100000) {
            currentDrawCount = Math.max(100000, currentDrawCount - 200000); 
            particleGeometry.setDrawRange(0, currentDrawCount);
            
            const slider = document.getElementById('input-particles');
            slider.value = currentDrawCount / 100000;
            document.getElementById('val-particles').innerText = (slider.value * 0.1).toFixed(1);
            
            frameDropsCount = 0; 
            console.warn("Performance baixa: Densidade reduzida.");
        }
    } else {
        frameDropsCount = Math.max(0, frameDropsCount - 1); 
    }

    particleUniforms.u_time.value = clock.getElapsedTime();
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

btnToggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
});

window.updateMagOptions = function() {
    const currentL = parseInt(document.getElementById('input-l').value);
    selectM.innerHTML = '';
    for (let m = -currentL; m <= currentL; m++) {
        let option = document.createElement('option');
        option.value = m;
        option.text = m;
        selectM.appendChild(option);
    }
    //Tenta manter no 0 se ele existir na faixa
    selectM.value = "0";
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
updateMagOptions(); //Popula o select na primeira carga

btnUpdate.addEventListener('click', () => {
    const val_n = parseFloat(document.getElementById('input-n').value);
    const val_l = parseFloat(document.getElementById('input-l').value);
    const val_m = parseFloat(document.getElementById('input-m').value);
    const val_spin = parseFloat(document.getElementById('input-spin').value);
    
    const sliderValue = parseInt(document.getElementById('input-particles').value);
    const requestedParticles = sliderValue * 100000;

    if (val_l >= val_n) {
        errorMsg.style.color = "#ff3366";
        errorMsg.innerHTML = `Erro: 'l' deve ser menor que 'n'. (Max: ${val_n - 1})`;
        return;
    }

    //Muda o ponteiro da GPU
    if (requestedParticles !== currentDrawCount) {
        currentDrawCount = requestedParticles;
        particleGeometry.setDrawRange(0, currentDrawCount);
    }

    particleUniforms.u_n.value = val_n;
    particleUniforms.u_l.value = val_l; 
    particleUniforms.u_m.value = val_m;
    particleUniforms.u_spin.value = val_spin;

    errorMsg.style.color = "#00ff88";
    let spinText = val_spin > 0 ? "+1/2" : "-1/2";
    errorMsg.innerHTML = `Orbital Atual: ${getOrbitalName(val_n, val_l, val_m)} (Spin ${spinText})`;
});

requestAnimationFrame(animate);
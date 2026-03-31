//Simulador Quântico
//Implementação de Física Estrita
//Inclusão do orbital 'f' e do spin


//1. Câmera
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

//2. Física
const vertexShader = `
    uniform float u_time;
    uniform float u_n; 
    uniform float u_l; 
    uniform float u_m; 
    uniform float u_spin;

    varying float v_opacity;
    varying float v_spin; 

    #define PI 3.1415926535897932384626433832795

    //Harmônicos Esféricos Exatos (Y_lm)
    float SphericalHarmonic(float l, float m, vec3 pos, float r) {
        if (r < 0.0001) return 0.0;

        //s (l=0)
        if (l == 0.0) return sqrt(1.0 / (4.0 * PI));

        //p (l=1)
        if (l == 1.0) {
            if (m == 0.0) return sqrt(3.0 / (4.0 * PI)) * (pos.z / r); //p_z
            if (m == 1.0) return sqrt(3.0 / (4.0 * PI)) * (pos.x / r); //p_x
            if (m == -1.0) return sqrt(3.0 / (4.0 * PI)) * (pos.y / r); //p_y
        }

        //d (l=2)
        if (l == 2.0) {
            if (m == 0.0) return sqrt(5.0 / (16.0 * PI)) * (3.0 * (pos.z * pos.z / (r * r)) - 1.0); //d_z2
            if (m == 1.0) return sqrt(15.0 / (4.0 * PI)) * (pos.x * pos.z / (r * r)); // d_xz
            if (m == -1.0) return sqrt(15.0 / (4.0 * PI)) * (pos.y * pos.z / (r * r)); // d_yz
            if (m == 2.0) return sqrt(15.0 / (16.0 * PI)) * ((pos.x * pos.x - pos.y * pos.y) / (r * r)); //d_x2-y2
            if (m == -2.0) return sqrt(15.0 / (4.0 * PI)) * (pos.x * pos.y / (r * r)); // d_xy
        }

        //f (l=3)
        if (l == 3.0) {
            float z2 = pos.z * pos.z;
            float r2 = r * r;
            float x2y2 = pos.x * pos.x - pos.y * pos.y;

            if (m == 0.0) return sqrt(7.0 / (16.0 * PI)) * (pos.z / r) * (5.0 * (z2 / r2) - 3.0); //f_z3
            if (m == 1.0) return sqrt(21.0 / (32.0 * PI)) * (pos.x / r) * (5.0 * (z2 / r2) - 1.0); //f_xz2
            if (m == -1.0) return sqrt(21.0 / (32.0 * PI)) * (pos.y / r) * (5.0 * (z2 / r2) - 1.0); //f_yz2
            if (m == 2.0) return sqrt(105.0 / (16.0 * PI)) * (pos.z / r) * (x2y2 / r2); //f_z(x2-y2)
            if (m == -2.0) return sqrt(105.0 / (4.0 * PI)) * (pos.x * pos.y * pos.z) / (r * r * r); //f_xyz
            if (m == 3.0) return sqrt(35.0 / (32.0 * PI)) * (pos.x / r) * ((pos.x * pos.x - 3.0 * pos.y * pos.y) / r2); //f_x(x2-3y2)
            if (m == -3.0) return sqrt(35.0 / (32.0 * PI)) * (pos.y / r) * ((3.0 * pos.x * pos.x - pos.y * pos.y) / r2); //f_y(3x2-y2)
        }

        return 0.0;
    }

    //Parte Radial Exata (R_nl)
    float RadialWaveFunction(float n, float l, float r) {
        if (n == 1.0 && l == 0.0) {
            return 2.0 * exp(-r); 
        }
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
            if (l == 0.0) return (1.0 / 4.0) * (1.0 - (3.0/4.0)*r + (1.0/8.0)*r2 - (1.0/192.0)*r3) * exp(-r / 4.0); //4s
            if (l == 1.0) return (sqrt(5.0) / (16.0 * sqrt(3.0))) * r * (1.0 - (1.0/4.0)*r + (1.0/80.0)*r2) * exp(-r / 4.0); //4p
            if (l == 2.0) return (1.0 / (64.0 * sqrt(5.0))) * r2 * (1.0 - (1.0/12.0)*r) * exp(-r / 4.0); //4d
            if (l == 3.0) return (1.0 / (768.0 * sqrt(35.0))) * r3 * exp(-r / 4.0); //4f
        }

        return 0.0;
    }

    void main() {
        vec3 finalPos = position;
        float r = length(finalPos);

        //Física (\Psi = R * Y)
        float R = RadialWaveFunction(u_n, u_l, r);
        float Y = SphericalHarmonic(u_l, u_m, finalPos, r);

        //Probabilidade Quântica Real (|\Psi|^2)
        float probDensity = (R * R) * (Y * Y);

        //Escala de brilho na tela
        float exposure = 100.0 * pow(u_n, 1.5);
        v_opacity = probDensity * exposure;

        v_spin = u_spin;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
        //gl_PointSize = 2.0;
    }
`;

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const vertexShaderFinal = vertexShader.replace("//gl_PointSize = 2.0", `gl_PointSize = ${isMobile ? '3.5' : '2.0'};`);

const fragmentShader = `
    varying float v_opacity;
    varying float v_spin; 
    
    void main() {
        if (v_opacity < 0.001) discard;

        //Spin (+1/2 = âmbar, -1/2 = azul)
        vec3 baseColor = (v_spin > 0.0) ? vec3(0.1, 0.6, 1.0) : vec3(1.0, 0.7, 0.2);
        vec3 coreColor = vec3(1.0, 1.0, 1.0);
        
        vec3 finalColor = mix(baseColor, coreColor, clamp(v_opacity - 1.0, 0.0, 1.0));

        gl_FragColor = vec4(finalColor, min(v_opacity, 1.0));
    }
`;

//3. Construção do Sistema Estatístico
const totalParticles = isMobile ? 500000 : 7500000;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(totalParticles * 3);

function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const maxDistributionRadius = 35.0; //raio de distribuição aumentado por conta do orbital 'f' 
for (let i = 0; i < totalParticles; i++) {
    particlePositions[i * 3] = randn_bm() * (maxDistributionRadius / 3.0); 
    particlePositions[i * 3 + 1] = randn_bm() * (maxDistributionRadius / 3.0); 
    particlePositions[i * 3 + 2] = randn_bm() * (maxDistributionRadius / 3.0); 
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Uniforms Iniciais
const particleUniforms = {
    u_time: { value: 0.0 },
    u_n: { value: 4.0 },
    u_l: { value: 3.0 },
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
scene.add(particles);

// Núcleo
const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), nucleusMaterial);
scene.add(nucleus);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animação Adaptativa
const clock = new THREE.Clock();
let lastFrameTime = 0;
const targetFPS = isMobile ? 30 : 60;
const frameInterval = 1000 / targetFPS;

function animate(currentTime) {
    requestAnimationFrame(animate);
    const deltaTime = currentTime - lastFrameTime;
    if (deltaTime >= frameInterval) {
        lastFrameTime = currentTime - (deltaTime % frameInterval);
        particleUniforms.u_time.value = clock.getElapsedTime();
        particles.rotation.y += 0.003; 
        controls.update();
        renderer.render(scene, camera);
    }
}

//4. Lógica do Painel de Controle
const btnUpdate = document.getElementById('btn-update');
const errorMsg = document.getElementById('error-msg');

// Função para traduzir a física para o nome químico do orbital
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

// Inicializa a interface
errorMsg.style.color = "#00ff88";
errorMsg.innerHTML = `Orbital Atual: ${getOrbitalName(4, 3, 0)} (Spin +1/2)`;

btnUpdate.addEventListener('click', () => {
    const val_n = parseFloat(document.getElementById('input-n').value);
    const val_l = parseFloat(document.getElementById('input-l').value);
    const val_m = parseFloat(document.getElementById('input-m').value);
    const val_spin = parseFloat(document.getElementById('input-spin').value);

    // Validações Físicas
    if (val_n < 1) { 
        errorMsg.style.color = "#ff3366";
        errorMsg.innerHTML = "Erro: 'n' deve ser >= 1"; 
        return; 
    }
    if (val_l < 0 || val_l >= val_n) { 
        errorMsg.style.color = "#ff3366";
        errorMsg.innerHTML = `Erro: 'l' entre 0 e ${val_n - 1}`; 
        return; 
    }
    if (Math.abs(val_m) > val_l) { 
        errorMsg.style.color = "#ff3366";
        errorMsg.innerHTML = `Erro: 'm' entre -${val_l} e +${val_l}`; 
        return; 
    }
    if (val_n > 4) { 
        errorMsg.style.color = "#ff3366";
        errorMsg.innerHTML = "Limite: Equações exatas até n=4 (Bloco f)."; 
        return; 
    }

    // Atualiza a GPU
    particleUniforms.u_n.value = val_n;
    particleUniforms.u_l.value = val_l;
    particleUniforms.u_m.value = val_m;
    particleUniforms.u_spin.value = val_spin;
    
    // Atualiza o painel
    errorMsg.style.color = "#00ff88";
    let spinText = val_spin > 0 ? "+1/2" : "-1/2";
    errorMsg.innerHTML = `Orbital Atual: ${getOrbitalName(val_n, val_l, val_m)} (Spin ${spinText})`;
});

requestAnimationFrame(animate);
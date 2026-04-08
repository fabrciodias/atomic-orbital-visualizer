// MOTOR GRÁFICO
const vertexShader = /* glsl */`
    uniform float u_time;
    uniform float u_n; 
    uniform float u_l; 
    uniform float u_m; 
    uniform float u_spin;
    uniform float u_starkE;
    uniform float u_n2;
    uniform float u_l2;
    uniform float u_m2;
    uniform float u_transition; 
    uniform float u_excitation; // O pico de energia da transição

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

        // Estado A
        float R_A = RadialWaveFunction(u_n, u_l, r);
        float Y_A = SphericalHarmonic(u_l, u_m, finalPos, r);
        float psi_puro_A = R_A * Y_A;

        float n_pert_A = u_n + 1.0;
        float R_pert_A = RadialWaveFunction(n_pert_A, 1.0, r);
        float Y_pert_A = SphericalHarmonic(1.0, 0.0, finalPos, r);
        float psi_A = psi_puro_A + ((u_starkE * (u_n * 2.0)) * (R_pert_A * Y_pert_A));

        // Estado B
        float R_B = RadialWaveFunction(u_n2, u_l2, r);
        float Y_B = SphericalHarmonic(u_l2, u_m2, finalPos, r);
        float psi_puro_B = R_B * Y_B;

        float n_pert_B = u_n2 + 1.0;
        float R_pert_B = RadialWaveFunction(n_pert_B, 1.0, r);
        float Y_pert_B = SphericalHarmonic(1.0, 0.0, finalPos, r);
        float psi_B = psi_puro_B + ((u_starkE * (u_n2 * 2.0)) * (R_pert_B * Y_pert_B));

        // A Mágica Suave da Superposição
        float psi_final = mix(psi_A, psi_B, u_transition);
        float probDensity = psi_final * psi_final;

        float exp_A = 250.0 * pow(u_n, 2.5);
        float exp_B = 250.0 * pow(u_n2, 2.5);
        float base_exposure = mix(exp_A, exp_B, u_transition);
        
        // Adiciona um ganho suave de brilho durante o pulso de excitação
        float final_exposure = base_exposure + (base_exposure * u_excitation * 1.5);
        
        v_opacity = probDensity * final_exposure;
        v_spin = u_spin;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
        //gl_PointSize = 2.0;
    }
`;

const fragmentShader = /* glsl */`
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
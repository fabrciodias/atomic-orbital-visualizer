# Quantum Volumetric Simulator: Hydrogen

Simulador de densidade de probabilidade para os orbitais do átomo de hidrogênio. O projeto utiliza computação gráfica para traduzir a função de onda eletrônica em uma nuvem de pontos volumétrica em tempo real.

## Proposta
A visualização de orbitais atômicos é frequentemente limitada a representações estáticas ou superfícies de contorno (isosuperfícies) que escondem a natureza probabilística do elétron. Este simulador utiliza a equação de Schrödinger para mapear densidades reais, permitindo a observação da estrutura interna dos orbitais e o efeito de perturbações externas, como o campo elétrico (Efeito Stark).

## Funcionalidades Técnicas
* **Visualização Volumétrica:** Renderização de até 5 milhões de partículas processadas via Web Workers.
* **Dinâmica Quântica:** Transições suaves (superposição) entre diferentes estados orbitais ($n, l, m$).
* **Efeito Stark:** Simulação de perturbação por campo elétrico externo ($E_z$).
* **Motor Gráfico:** Implementação em GLSL (Shaders) para execução direta na GPU, garantindo performance em dispositivos móveis.
* **PWA (Progressive Web App):** Suporte para instalação e funcionamento completo em ambiente offline.

## Parâmetros Configuráveis
1. **Número Quântico Principal ($n$):** Define o nível de energia e a extensão radial.
2. **Número Quântico Azimutal ($l$):** Determina a forma geométrica do orbital.
3. **Número Quântico Magnético ($m$):** Controla a orientação espacial.
4. **Spin ($m_s$):** Representação do momento angular intrínseco através de diferenciação cromática.

## Tecnologias Utilizadas
* **Three.js:** Manipulação da cena 3D e câmeras.
* **GLSL:** Shaders personalizados para o cálculo da densidade de probabilidade.
* **JavaScript (ES6+):** Lógica de controle e processamento paralelo.

## Uso
O simulador pode ser acessado diretamente pelo navegador. Para capturas acadêmicas, as ferramentas de exportação permitem salvar o estado atual em alta resolução ou gravar sequências de transição.
# Atomic Orbital Visualizer
Simulação computacional de orbitais atômicos baseada na distribuição de probabilidade da posição do elétron, com renderização em tempo real utilizando GPU (WebGL/GLSL).

# Descrição
Este projeto tem como objetivo representar visualmente orbitais atômicos a partir do modelo probabilístico da mecânica quântica.
Diferente da abordagem clássica de órbitas bem definidas, a simulação constrói uma nuvem de densidade eletrônica, onde cada ponto representa uma possível posição do elétron no espaço.
A distribuição das partículas busca reproduzir qualitativamente a forma dos orbitais.

# Funcionamento
As partículas são geradas com base em distribuições associadas aos orbitais atômicos
Cada ponto representa uma amostra da função densidade de probabilidade
O sistema trabalha com grandes volumes de dados (de 100 mil até 10 milhões partículas)
A renderização é realizada via WebGL, com processamento paralelo na GPU por meio de shaders (GLSL). 

# Interação
A interface permite:
Seleção de orbitais (s, p, d, f)
Ajuste dos números quânticos:
Principal (n)
Azimutal (l)
Magnético (m)
Spin
Controle da quantidade de partículas.

# Performance
O projeto foi estruturado com foco em eficiência computacional:
Uso de WebGL para paralelização massiva na GPU
Redução de carga na CPU
Atualização sincronizada com _requestAnimationFrame_
Separação entre geração de dados e renderização
O desempenho depende diretamente da capacidade da GPU do dispositivo.

# Tecnologias
HTML5
CSS3
JavaScript (Vanilla)
WebGL / GLSL

# Execução
Atualmente, é possível executar por meio do link:
[https://fabrciodias.github.io/atomic-orbital-visualizer/]
Não há dependências externas.

# Limitações
A simulação é qualitativa e não resolve numericamente a equação de Schrödinger
Dependência de suporte a WebGL no navegador
Limitações associadas ao desempenho da GPU.

# Possíveis extensões
Paralelização da geração de dados via Web Workers
Exportação de dados (JSON, CSV) e imagens da simulação
Implementação de novos modelos e refinamentos físicos
Otimizações adicionais de renderização.

# Referência conceitual
Baseado no modelo quântico de distribuição de probabilidade eletrônica em átomos.

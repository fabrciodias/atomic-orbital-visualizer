//WORKER ESTRUTURAL
function randn_bm() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

//Escuta as mensagens da Thread principal
self.onmessage = function(e) {
    const maxParticles = e.data.maxParticles;
    const maxDistributionRadius = e.data.maxDistributionRadius;

    //Aloca a memória direto no núcleo secundário
    const particlePositions = new Float32Array(maxParticles * 3);

    for (let i = 0; i < maxParticles; i++) {
        particlePositions[i * 3] = randn_bm() * (maxDistributionRadius / 3.0); 
        particlePositions[i * 3 + 1] = randn_bm() * (maxDistributionRadius / 3.0); 
        particlePositions[i * 3 + 2] = randn_bm() * (maxDistributionRadius / 3.0);

        //A cada 250K partículas, mandamos um aviso para atualizar a UI
        if (i > 0 && i % 250000 === 0) {
            const progress = (i / maxParticles) * 100;
            self.postMessage({ type: 'progress', progress: progress, count: i });
        }
    }

    //TRANSFERABLE OBJECT
    self.postMessage({ type: 'done', positions: particlePositions }, [particlePositions.buffer]);
};
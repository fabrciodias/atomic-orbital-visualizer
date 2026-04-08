const CACHE_NAME = 'orbital-v2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './shaders.js',
    './worker.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
];

// Instala o operário e salva os arquivos no celular
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

// Intercepta os pedidos do site e entrega o que está salvo offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
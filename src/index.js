const express = require('express');
const path = require('path');

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Configurar middleware para archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas
app.get('/', (req, res) => {
    res.render('pages/index');
});

app.get('/dashboard', (req, res) => {
    // Detectar si es una solicitud AJAX o una carga de página normal
    const isAjaxRequest = req.xhr || req.headers.accept.indexOf('json') > -1;
    
    if (isAjaxRequest) {
        // Si es una solicitud AJAX, renderizar solo el contenido principal
        res.render('pages/dashboard', { layout: false });
    } else {
        // Si es una carga normal, renderizar la página completa
        res.render('pages/dashboard');
    }
});

// Rutas para cargar secciones parciales
app.get('/partials/work-section', (req, res) => {
    res.render('partials/work-section');
});

app.get('/partials/study-section', (req, res) => {
    res.render('partials/study-section');
});

app.get('/partials/leisure-section', (req, res) => {
    res.render('partials/leisure-section');
});

// Middleware para manejar rutas no encontradas (error 404)
app.use((req, res) => {
    res.status(404).render('pages/404');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
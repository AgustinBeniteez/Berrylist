const express = require('express');
const path = require('path');

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3005;

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Configurar middleware para archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas
app.get('/', (req, res) => {
    res.render('pages/index');
});

// Redirect plain /settings to dashboard settings section
app.get('/settings', (req, res) => {
    res.redirect('/dashboard/settings');
});

// Ruta principal del dashboard
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

// Rutas específicas para cada sección del dashboard
app.get('/dashboard/:section', (req, res) => {
    const validSections = ['calendar', 'work', 'study', 'leisure', 'settings'];
    const section = req.params.section;
    
    if (validSections.includes(section)) {
        // Detectar si es una solicitud AJAX o una carga de página normal
        const isAjaxRequest = req.xhr || req.headers.accept.indexOf('json') > -1;
        
        if (isAjaxRequest) {
            // Si es una solicitud AJAX, renderizar solo la sección parcial
            res.render(`partials/sections/${section}-section`);
        } else {
            // Si es una carga normal, renderizar la página completa con la sección activa
            res.render('pages/dashboard', { activeSection: section });
        }
    } else if (section === 'menu') {
        // Ruta especial para el menú de selección
        res.render('pages/dashboard');
    } else {
        res.redirect('/dashboard');
    }
});

// Rutas para cargar secciones parciales
app.get('/partials/sections/calendar-section', (req, res) => {
    res.render('partials/sections/calendar-section');
});

app.get('/partials/sections/work-section', (req, res) => {
    res.render('partials/sections/work-section');
});

app.get('/partials/sections/study-section', (req, res) => {
    res.render('partials/sections/study-section');
});

app.get('/partials/sections/leisure-section', (req, res) => {
    res.render('partials/sections/leisure-section');
});

app.get('/partials/sections/settings-section', (req, res) => {
    res.render('partials/sections/settings-section');
});

// Middleware para manejar rutas no encontradas (error 404)
app.use((req, res) => {
    res.status(404).render('pages/404');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
# Guía para Crear Nuevas Páginas en Proyecto Berry

Como crear paso a paso una nueva página desde cero en el proyecto Berry.

## Estructura del Proyecto

El proyecto sigue esta estructura:
```
Proyecto-berry/
├── src/
│   └── index.js          # Servidor principal y rutas
├── views/
│   ├── pages/             # Páginas principales
│   └── partials/          # Componentes reutilizables
├── public/
│   ├── css/               # Estilos CSS
│   ├── js/                # JavaScript del cliente
│   └── img/               # Imágenes
└── package.json
```

## Pasos para Crear una Nueva Página

### 1. Crear el Archivo EJS de la Página

Crea un nuevo archivo en `views/pages/` con el nombre de tu página:

```bash
views/pages/mi-nueva-pagina.ejs
```

**Estructura básica del archivo EJS:**
```html
<!DOCTYPE html>
<html lang="es">
<%- include('../partials/head') %>
<body>
    <%- include('../partials/header') %>
    
    <main class="main-content">
        <div class="container">
            <h1>Mi Nueva Página</h1>
            <p>Contenido de la página aquí...</p>
        </div>
    </main>
    
    <%- include('../partials/footer') %>
</body>
</html>
```

### 2. Crear Estilos CSS (Opcional)

Si tu página necesita estilos específicos, crea un archivo CSS en `public/css/`:

```bash
public/css/mi-nueva-pagina.css
```

**Ejemplo de contenido CSS:**
```css
/* Estilos específicos para mi-nueva-pagina */
.mi-nueva-pagina {
    padding: 2rem 0;
}

.mi-nueva-pagina h1 {
    color: var(--primary-color);
    text-align: center;
    margin-bottom: 2rem;
}
```

### 3. Crear JavaScript (Opcional)

Si necesitas funcionalidad JavaScript específica, crea un archivo en `public/js/`:

```bash
public/js/mi-nueva-pagina.js
```

**Ejemplo de contenido JavaScript:**
```javascript
// JavaScript específico para mi-nueva-pagina
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mi nueva página cargada');
    
    // Tu código JavaScript aquí
});
```

### 4. Modificar index.js para Agregar la Ruta

Este es el paso más importante. Debes agregar la ruta en `src/index.js`:

**Agregar la ruta GET:**
```javascript
// Agregar esta línea junto con las otras rutas
app.get('/mi-nueva-pagina', (req, res) => {
    res.render('pages/mi-nueva-pagina', {
        title: 'Mi Nueva Página',
        currentPage: 'mi-nueva-pagina'
    });
});
```

### 5. Incluir CSS y JS en el Head (Si es necesario)

Si creaste archivos CSS o JS específicos, inclúyelos en `views/partials/head.ejs`:

```html
<!-- Agregar en la sección de CSS -->
<% if (typeof currentPage !== 'undefined' && currentPage === 'mi-nueva-pagina') { %>
    <link rel="stylesheet" href="/css/mi-nueva-pagina.css">
<% } %>

<!-- Agregar en la sección de JavaScript -->
<% if (typeof currentPage !== 'undefined' && currentPage === 'mi-nueva-pagina') { %>
    <script src="/js/mi-nueva-pagina.js"></script>
<% } %>
```

### 6. Agregar Navegación (Opcional)

Si quieres que la página aparezca en el menú de navegación, modifica `views/partials/header.ejs`:

```html
<nav class="main-nav">
    <ul>
        <li><a href="/" class="<%= currentPage === 'home' ? 'active' : '' %>">Inicio</a></li>
        <li><a href="/dashboard" class="<%= currentPage === 'dashboard' ? 'active' : '' %>">Dashboard</a></li>
        <li><a href="/mi-nueva-pagina" class="<%= currentPage === 'mi-nueva-pagina' ? 'active' : '' %>">Mi Nueva Página</a></li>
    </ul>
</nav>
```

## Ejemplo Completo

Supongamos que queremos crear una página "Contacto":

### 1. Crear `views/pages/contacto.ejs`:
```html
<!DOCTYPE html>
<html lang="es">
<%- include('../partials/head') %>
<body>
    <%- include('../partials/header') %>
    
    <main class="main-content">
        <div class="container">
            <h1>Contacto</h1>
            <form class="contact-form">
                <div class="form-group">
                    <label for="nombre">Nombre:</label>
                    <input type="text" id="nombre" name="nombre" required>
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="mensaje">Mensaje:</label>
                    <textarea id="mensaje" name="mensaje" required></textarea>
                </div>
                <button type="submit">Enviar</button>
            </form>
        </div>
    </main>
    
    <%- include('../partials/footer') %>
</body>
</html>
```

### 2. Agregar ruta en `src/index.js`:
```javascript
app.get('/contacto', (req, res) => {
    res.render('pages/contacto', {
        title: 'Contacto - Berry',
        currentPage: 'contacto'
    });
});
```

### 3. Crear `public/css/contacto.css`:
```css
.contact-form {
    max-width: 600px;
    margin: 0 auto;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.form-group textarea {
    height: 120px;
    resize: vertical;
}

button[type="submit"] {
    background-color: var(--primary-color);
    color: white;
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

button[type="submit"]:hover {
    background-color: var(--primary-color-dark);
}
```

## Consejos Importantes

1. **Nombres de archivos**: Usa nombres descriptivos y consistentes
2. **Rutas**: Las rutas en `index.js` deben coincidir con los nombres que uses en la navegación
3. **Variables EJS**: Siempre pasa `title` y `currentPage` desde la ruta
4. **CSS**: Reutiliza las clases existentes cuando sea posible
5. **Responsive**: Asegúrate de que tu página sea responsive usando las clases CSS existentes
6. **Testing**: Prueba tu página en diferentes dispositivos y navegadores

## Reiniciar el Servidor

Después de hacer cambios en `index.js`, necesitas reiniciar el servidor:

```bash
npm start
```

O si usas nodemon:
```bash
npm run dev
```

¡Ya tienes tu nueva página funcionando! Accede a ella visitando `http://localhost:3000/tu-nueva-ruta`
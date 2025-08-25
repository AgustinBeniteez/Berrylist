# Proyecto Berry 🍓

## Descripción

Berry es una aplicación web diseñada para ayudarte a organizar y gestionar tus listas personales en diferentes categorías de tu vida. Puedes mantener un seguimiento de tus actividades laborales, académicas y de ocio en un solo lugar.

## Directrices de diseño
   [Documentacion de directrices de diseño DevReadme.md](./DevReadme.md)

## Características Principales

### Sección de Trabajo 💼
- Gestión de horarios laborales
- Seguimiento de tareas y proyectos
- Organización de reuniones y eventos importantes

### Sección de Estudio 📚
- Horarios de clases
- Fechas de exámenes
- Planificación de sesiones de estudio
- Seguimiento de tareas académicas

### Sección de Ocio 🎮
- Lista de películas por ver
- Series en por ver
- Juegos por jugar
- Canciones favoritas

### Perfil Personal 👤
- Personalización de perfil
- Compartir listas con amigos
- Ver recomendaciones basadas en tus gustos
- Descubrir nuevas películas, series, juegos y canciones

## Tecnologías

- Frontend: HTML5, CSS3, JavaScript, Node.js
- Diseño Responsivo para adaptarse a diferentes dispositivos

## Instalación
1. Clona este repositorio:
   ```
   git clone https://github.com/AgustinBeniteez/Proyecto-berry.git
   cd Proyecto-berry
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```
   npm start
   ```
   La aplicación estará disponible en http://localhost:3001

## Despliegue en Vercel

1. Asegúrate de que el archivo `vercel.json` esté en la raíz del proyecto.

2. Conecta tu repositorio de GitHub con Vercel:
   - Crea una cuenta en [Vercel](https://vercel.com)
   - Importa el repositorio desde GitHub
   - Vercel detectará automáticamente la configuración de Node.js

3. Configura las variables de entorno si es necesario.

4. Despliega la aplicación haciendo clic en "Deploy".

5. Si encuentras errores 404, verifica que:
   - El archivo `vercel.json` esté correctamente configurado
   - El punto de entrada (`src/index.js`) sea accesible
   - No haya archivos importantes excluidos por `.gitignore`
   
   > **IMPORTANTE**: Asegúrate de instalar las dependencias antes de ejecutar el servidor, de lo contrario, recibirás un error de módulo no encontrado.

## ABRIR SERVER LOCAL HOST
   ```
   npm run run
   ```
## Próximas Funcionalidades

- Notificaciones para recordatorios
- Modo oscuro/claro

## Contribución

¿Tienes ideas para mejorar Berry? ¡Nos encantaría escucharlas! Puedes contribuir al proyecto mediante pull requests o abriendo issues con tus sugerencias.

---

© 2025 Proyecto Berry - Organiza tu vida de forma dulce y sencilla 🍓
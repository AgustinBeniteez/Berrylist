# Configuración de Firebase

Este proyecto utiliza Firebase para autenticación y almacenamiento de datos. Para mantener la seguridad, las credenciales de Firebase no están incluidas en el repositorio.

## Configuración inicial

1. **Crear proyecto en Firebase Console**
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita Authentication y Firestore Database

2. **Obtener credenciales**
   - En la configuración del proyecto, ve a "Configuración del proyecto"
   - En la sección "Tus apps", selecciona la app web
   - Copia la configuración de Firebase

3. **Configurar el proyecto local**
   - Copia el archivo `public/js/firebase-config.example.js` como `public/js/firebase-config.js`
   - Reemplaza los valores de ejemplo con tus credenciales reales:
   
   ```javascript
   const firebaseConfig = {
       apiKey: "tu-api-key-real",
       authDomain: "tu-proyecto.firebaseapp.com",
       projectId: "tu-proyecto-id-real",
       storageBucket: "tu-proyecto.appspot.com",
       messagingSenderId: "tu-sender-id-real",
       appId: "tu-app-id-real"
   };
   ```

4. **Configurar reglas de Firestore**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Permitir acceso solo a datos del usuario autenticado
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         
         // Permitir acceso a la subcolección de eventos
         match /events/{eventId} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
   }
   ```

5. **Configurar Authentication**
   - Habilita los métodos de autenticación que desees usar:
     - Email/Password
     - Google Sign-In
   - Para Google Sign-In, configura el OAuth consent screen

## Seguridad

- ⚠️ **NUNCA** subas el archivo `firebase-config.js` al repositorio
- El archivo está incluido en `.gitignore` para prevenir commits accidentales
- Si necesitas compartir credenciales, hazlo de forma segura (no por email o chat)

## Funcionalidades implementadas

- ✅ Autenticación con email/password
- ✅ Autenticación con Google
- ✅ Sincronización de eventos del calendario por usuario
- ✅ Almacenamiento local como respaldo
- ✅ Interfaz de usuario responsive

## Troubleshooting

Si ves el mensaje "Firebase configuration not found" en la consola:
1. Verifica que existe el archivo `firebase-config.js`
2. Asegúrate de que las credenciales son correctas
3. Revisa que el archivo se está cargando correctamente en el navegador
// Script para manejar el cambio de tema (claro/oscuro)

// Función para establecer una cookie persistente
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  // Añadir max-age para mayor persistencia (2 años en segundos)
  const maxAge = "; max-age=" + (60 * 60 * 24 * 730);
  document.cookie = name + "=" + (value || "") + expires + maxAge + "; path=/; SameSite=Lax";
}

// Función para obtener una cookie
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  const themeSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
  
  // Verificar si el usuario ha seleccionado un tema manualmente (guardado en userTheme)
  const userSelectedTheme = getCookie('userTheme');
  const currentTheme = getCookie('theme');
  
  if (userSelectedTheme) {
    // Si el usuario ha seleccionado un tema manualmente, usamos ese
    document.documentElement.setAttribute('data-theme', userSelectedTheme);
    
    if (userSelectedTheme === 'dark') {
      themeSwitch.checked = true;
    } else {
      themeSwitch.checked = false;
    }
  } else if (currentTheme) {
    // Si hay un tema guardado en cookie pero no fue seleccionado manualmente
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (currentTheme === 'dark') {
      themeSwitch.checked = true;
    }
  } else {
    // Detectar preferencia del sistema operativo si no hay cookie
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (prefersDarkScheme.matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeSwitch.checked = true;
      setCookie('theme', 'dark', 730); // Guardar en cookie por 2 años
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeSwitch.checked = false;
      setCookie('theme', 'light', 730); // Guardar en cookie por 2 años
    }
  }

  // Función para cambiar el tema
  function switchTheme(e) {
    const newTheme = e.target.checked ? 'dark' : 'light';
    
    // Establecer el tema en el documento
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Guardar la selección del usuario con prioridad
    setCookie('userTheme', newTheme, 730); // Guardar en cookie por 2 años
    setCookie('theme', newTheme, 730); // Mantener también la cookie theme por compatibilidad
    
    // Guardar en localStorage como respaldo adicional
    try {
      localStorage.setItem('userTheme', newTheme);
    } catch (e) {
      console.log('localStorage no disponible');
    }
  }

  // Escuchar el evento de cambio en el switch
  themeSwitch.addEventListener('change', switchTheme, false);
});
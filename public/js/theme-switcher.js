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
    
    if (themeSwitch) {
      themeSwitch.checked = userSelectedTheme === 'dark';
    }
  } else if (currentTheme) {
    // Si hay un tema guardado en cookie pero no fue seleccionado manualmente
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (themeSwitch && currentTheme === 'dark') {
      themeSwitch.checked = true;
    }
  } else {
    // Detectar preferencia del sistema operativo si no hay cookie
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (prefersDarkScheme.matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeSwitch) themeSwitch.checked = true;
      setCookie('theme', 'dark', 730); // Guardar en cookie por 2 años
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeSwitch) themeSwitch.checked = false;
      setCookie('theme', 'light', 730); // Guardar en cookie por 2 años
    }
  }

  // Función para cambiar el tema con animación
  function switchTheme(e) {
    const newTheme = e.target.checked ? 'dark' : 'light';
    
    // Agregar clase de transición para animación suave
    document.body.classList.add('theme-transitioning');
    
    // Crear efecto de ondas durante la transición
    createThemeTransitionEffect(newTheme);
    
    // Establecer el tema en el documento con un pequeño delay para la animación
    setTimeout(() => {
      document.documentElement.setAttribute('data-theme', newTheme);
    }, 150);
    
    // Remover la clase de transición después de la animación
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 800);
    
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
  
  // Función para crear efecto visual durante la transición de tema
  function createThemeTransitionEffect(newTheme) {
    // Crear elemento de overlay para la transición
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      background: ${newTheme === 'dark' ? 
        'radial-gradient(circle at center, rgba(44, 62, 80, 0.8) 0%, transparent 70%)' : 
        'radial-gradient(circle at center, rgba(135, 206, 235, 0.8) 0%, transparent 70%)'
      };
      opacity: 0;
      transform: scale(0);
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(overlay);
    
    // Animar el overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'scale(3)';
    });
    
    // Remover el overlay después de la animación
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(0)';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }, 400);
  }

  // Escuchar el evento de cambio en el switch si existe en la página
  if (themeSwitch) {
    themeSwitch.addEventListener('change', switchTheme, false);
  }
});
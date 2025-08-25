// Script para manejar el cambio de tema (claro/oscuro)

document.addEventListener('DOMContentLoaded', () => {
  const themeSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
  const currentTheme = localStorage.getItem('theme');

  // Verificar si hay un tema guardado en localStorage
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (currentTheme === 'dark') {
      themeSwitch.checked = true;
    }
  }

  // Función para cambiar el tema
  function switchTheme(e) {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  // Escuchar el evento de cambio en el switch
  themeSwitch.addEventListener('change', switchTheme, false);
});
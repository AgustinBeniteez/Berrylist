/**
 * Script para manejar los enlaces de navegación que dirigen a secciones específicas del dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
  // Buscar todos los enlaces con atributo data-section
  const sectionLinks = document.querySelectorAll('a[data-section]');
  
  // Añadir event listener a cada enlace
  sectionLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Obtener la sección a la que se quiere navegar
      const section = this.getAttribute('data-section');
      
      // Si estamos en la página de dashboard, prevenir la navegación y activar la sección
      if (window.location.pathname === '/dashboard') {
        e.preventDefault();
        activateSection(section);
      } else {
        // Si no estamos en dashboard, guardar la sección en localStorage para activarla después
        localStorage.setItem('activeSection', section);
      }
    });
  });
  
  // Si estamos en la página de dashboard, verificar si hay una sección guardada para activar
  if (window.location.pathname === '/dashboard') {
    const activeSection = localStorage.getItem('activeSection');
    if (activeSection) {
      // Activar la sección y limpiar localStorage
      activateSection(activeSection);
      localStorage.removeItem('activeSection');
    }
  }
  
  // Función para activar una sección específica en el dashboard
  function activateSection(section) {
    // Buscar el botón de navegación correspondiente y simular un clic
    const navButton = document.querySelector(`.nav-btn[data-section="${section}"]`);
    if (navButton) {
      navButton.click();
    }
  }
});
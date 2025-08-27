/**
 * Script para manejar los enlaces de navegación que dirigen a secciones específicas del dashboard
 * Permite la navegación directa a secciones mediante URL y actualiza la URL al cambiar de sección
 */

document.addEventListener('DOMContentLoaded', function() {
  // Buscar todos los enlaces y tarjetas con atributo data-section
  const sectionLinks = document.querySelectorAll('a[data-section], .card[data-section]');
  
  // Añadir event listener a cada enlace
  sectionLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Obtener la sección a la que se quiere navegar
      const section = this.getAttribute('data-section');
      
      // Si estamos en cualquier ruta de dashboard, prevenir la navegación y activar la sección
      if (window.location.pathname.startsWith('/dashboard')) {
        e.preventDefault();
        // Actualizar la URL sin recargar la página
        updateUrlWithoutReload(section);
        activateSection(section);
      } else {
        // Si no estamos en dashboard, navegar directamente a la sección
        e.preventDefault();
        window.location.href = `/dashboard/${section}`;
      }
    });
  });
  
  // Si estamos en la página de dashboard, verificar si hay una sección guardada para activar
  if (window.location.pathname === '/dashboard') {
    const activeSection = localStorage.getItem('activeSection');
    if (activeSection) {
      // Actualizar la URL y activar la sección
      updateUrlWithoutReload(activeSection);
      activateSection(activeSection);
      localStorage.removeItem('activeSection');
    }
  }
  
  // Función para actualizar la URL sin recargar la página
  function updateUrlWithoutReload(section) {
    // Si estamos en el menú de selección, usar la URL especial
    const newUrl = section ? `/dashboard/${section}` : '/dashboard/menu';
    window.history.pushState({ section: section }, '', newUrl);
  }
  
  // Función para activar una sección específica en el dashboard
  function activateSection(section) {
    // Buscar el botón de navegación correspondiente
    const navButton = document.querySelector(`.nav-btn[data-section="${section}"]`);
    if (navButton) {
      // Marcar el botón como activo
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      navButton.classList.add('active');
      
      // Cargar el contenido de la sección
      loadSectionContent(section);
    }
  }
  
  // Función para cargar el contenido de una sección
  async function loadSectionContent(section) {
    try {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) return;
      
      // Hacer una petición para obtener el contenido de la sección
      const response = await fetch(`/partials/sections/${section}-section`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la sección: ${response.status}`);
      }
      
      const sectionContent = await response.text();
      
      // Actualizar el contenido principal
      mainContent.innerHTML = sectionContent;
      
      // Activar la sección cargada
      const sectionElement = mainContent.querySelector('.section-content');
      if (sectionElement) {
        sectionElement.classList.add('active');
      }
    } catch (error) {
      console.error('Error al cargar la sección:', error);
    }
  }
  
  // Manejar eventos de navegación del navegador (botones atrás/adelante)
  window.addEventListener('popstate', function(event) {
    if (event.state && event.state.section) {
      activateSection(event.state.section);
    } else {
      // Si no hay estado, estamos en la página principal del dashboard
      if (window.location.pathname === '/dashboard') {
        // Mostrar el dashboard principal
        const dashboardBtn = document.querySelector('.sidebar-header');
        if (dashboardBtn) dashboardBtn.click();
      }
    }
  });
});
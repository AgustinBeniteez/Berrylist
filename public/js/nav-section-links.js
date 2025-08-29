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
      
      // Verificar autenticación antes de permitir acceso
      if (!checkAuthenticationAccess(section)) {
        e.preventDefault();
        showAuthenticationRequiredMessage(section);
        return;
      }
      
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

  // Al cargar directamente una ruta de sección (/dashboard/<section>), activar esa sección
  const pathParts = window.location.pathname.split('/');
  if (pathParts.length === 3 && pathParts[1] === 'dashboard' && pathParts[2]) {
    const directSection = pathParts[2];
    activateSection(directSection);
  }
  
  // Inicializar el estado visual de los botones
  updateNavigationButtonsState();
  
  // Escuchar cambios en el estado de autenticación
  if (window.authManager) {
    // Verificar periódicamente el estado de autenticación para actualizar la UI
    setInterval(() => {
      updateNavigationButtonsState();
    }, 1000);
  }
  
  // Función para actualizar la URL sin recargar la página
  function updateUrlWithoutReload(section) {
    // Si estamos en el menú de selección, usar la URL especial
    const newUrl = section ? `/dashboard/${section}` : '/dashboard/menu';
    window.history.pushState({ section: section }, '', newUrl);
  }
  
  // Función para verificar si el usuario puede acceder a una sección
  function checkAuthenticationAccess(section) {
    // Permitir acceso a settings sin autenticación
    if (section === 'settings') {
      return true;
    }
    
    // Para todas las demás secciones, verificar autenticación
    // Si Firebase está cargando (authManager existe pero currentUser aún no está definido),
    // permitimos el acceso temporalmente y dejamos que la UI se actualice después
    if (window.authManager) {
      // Si authManager existe pero aún no ha terminado de inicializarse, permitir acceso
      // La UI se actualizará cuando el estado de autenticación esté listo
      return true;
    }
    
    // Si no hay authManager, no permitir acceso
    return false;
  }
  
  // Función para mostrar mensaje cuando se requiere autenticación
  function showAuthenticationRequiredMessage(section) {
    // Crear o mostrar modal de login si no está autenticado
    if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
      window.authManager.showLoginModal();
    } else {
      // Fallback: mostrar alerta
      alert('Debes iniciar sesión para acceder a esta sección. Solo puedes usar Settings sin autenticación.');
    }
  }
  
  // Función para actualizar el estado visual de los botones de navegación
  function updateNavigationButtonsState() {
    const isAuthenticated = window.authManager && window.authManager.currentUser;
    const navButtons = document.querySelectorAll('.nav-btn[data-section]');
    
    navButtons.forEach(button => {
      const section = button.getAttribute('data-section');
      
      if (section === 'settings') {
        // Settings siempre está disponible
        button.classList.remove('disabled');
        button.style.opacity = '1';
        button.style.pointerEvents = 'auto';
      } else {
        // Otras secciones requieren autenticación
        if (isAuthenticated) {
          button.classList.remove('disabled');
          button.style.opacity = '1';
          button.style.pointerEvents = 'auto';
        } else {
          button.classList.add('disabled');
          button.style.opacity = '0.5';
          button.style.pointerEvents = 'none';
        }
      }
    });
    
    // También actualizar las tarjetas del dashboard principal
    const cards = document.querySelectorAll('.card[data-section]');
    cards.forEach(card => {
      const section = card.getAttribute('data-section');
      
      if (section === 'settings') {
        // Settings siempre está disponible
        card.classList.remove('disabled');
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
      } else {
        // Otras secciones requieren autenticación
        if (isAuthenticated) {
          card.classList.remove('disabled');
          card.style.opacity = '1';
          card.style.pointerEvents = 'auto';
        } else {
          card.classList.add('disabled');
          card.style.opacity = '0.5';
          card.style.pointerEvents = 'none';
        }
      }
    });
  }
  
  // Función para activar una sección específica en el dashboard
  function activateSection(section) {
    // Verificar autenticación antes de activar la sección
    if (!checkAuthenticationAccess(section)) {
      showAuthenticationRequiredMessage(section);
      return;
    }
    
    // Buscar el botón de navegación correspondiente
    const navButton = document.querySelector(`.nav-btn[data-section="${section}"]`);
    if (navButton) {
      // Marcar el botón como activo
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      navButton.classList.add('active');
      
      // Cargar el contenido de la sección
      loadSectionContent(section);
      
      // Si es una sección que requiere autenticación y authManager existe,
      // verificamos periódicamente el estado de autenticación para actualizar la UI si es necesario
      if (section !== 'settings' && window.authManager) {
        const authCheckInterval = setInterval(() => {
          // Si el usuario no está autenticado después de que Firebase haya cargado completamente,
          // y la sección requiere autenticación, mostrar el modal de login
          if (window.authManager.authInitialized && !window.authManager.currentUser) {
            clearInterval(authCheckInterval);
            showAuthenticationRequiredMessage(section);
          } else if (window.authManager.currentUser) {
            // Si el usuario está autenticado, limpiar el intervalo
            clearInterval(authCheckInterval);
          }
        }, 500); // Verificar cada 500ms
        
        // Limpiar el intervalo después de 5 segundos para evitar verificaciones infinitas
        setTimeout(() => clearInterval(authCheckInterval), 5000);
      }
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
      
      // Aplicar traducciones al nuevo contenido
      if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
        window.i18n.applyTranslations();
      }
      
      // Activar la sección cargada
      const sectionElement = mainContent.querySelector('.section-content');
      if (sectionElement) {
        sectionElement.classList.add('active');
      }

      // Inicializaciones específicas por sección
      if (section === 'calendar' && window.berryCalendar) {
        // Re-render calendar when switching back
        window.berryCalendar.render();
        window.berryCalendar.attachEventListeners();
      }

      if (section === 'settings') {
        // Initialize settings script if needed
        if (window.initSettingsSection) {
          window.initSettingsSection();
        }
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
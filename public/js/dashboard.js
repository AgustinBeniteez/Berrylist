document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const mainContent = document.getElementById('main-content');
  const navButtons = document.querySelectorAll('.nav-btn');
  const cards = document.querySelectorAll('.card');
  const sidebarHeader = document.querySelector('.sidebar-header');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  
  // Obtener la sección activa de la URL o de la variable serverActiveSection
  let activeSection = '';
  
  // Verificar si hay una sección activa proporcionada por el servidor
  if (typeof serverActiveSection !== 'undefined' && serverActiveSection) {
    activeSection = serverActiveSection;
  } else {
    // Si no hay sección del servidor, intentar obtenerla de la URL
    const urlPath = window.location.pathname;
    const match = urlPath.match(/\/dashboard\/([\w-]+)/);
    if (match && match[1]) {
      // Si la sección es 'menu', no cargar ninguna sección específica
      if (match[1] === 'menu') {
        activeSection = '';
      } else {
        activeSection = match[1];
      }
    }
  }
  
  // Variable para almacenar el contenido original del dashboard
  let dashboardContent = mainContent.innerHTML;
  
  // Función para controlar la visibilidad del sidebar en móvil
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('show');
    });
    
    // Cerrar sidebar al hacer clic en un enlace (en móvil)
    navButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('show');
        }
      });
    });
    
      // Cerrar sidebar al hacer clic fuera de él (en móvil)
    document.addEventListener('click', function(event) {
      if (window.innerWidth <= 768 && 
          !sidebar.contains(event.target) && 
          !sidebarToggle.contains(event.target) &&
          sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
      }
    });
  }
  
  // Añadir evento de clic al encabezado de la barra lateral para mostrar el dashboard
  if (sidebarHeader) {
    sidebarHeader.addEventListener('click', function() {
      showDashboard();
      // Actualizar la URL a /dashboard/menu
      window.history.pushState({}, '', '/dashboard/menu');
    });
  }
  
  // Función para mostrar el dashboard original
  function showDashboard() {
    // Detener monitoreo del calendario si está activo
    if (typeof window.stopCalendarMonitoring === 'function') {
      window.stopCalendarMonitoring();
    }
    
    mainContent.innerHTML = dashboardContent;
    
    // Quitar la clase activa de todos los botones de navegación
    navButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Añadir eventos a las tarjetas del dashboard
    const dashboardCards = mainContent.querySelectorAll('.card');
    dashboardCards.forEach(card => {
      card.addEventListener('click', function() {
        const section = this.dataset.section;
        if (section) {
          loadSection(section);
        }
      });
    });
  }
  
  // Función para cargar una sección
  async function loadSection(sectionName) {
    try {
      // Detener monitoreo del calendario si está activo
      if (typeof window.stopCalendarMonitoring === 'function') {
        window.stopCalendarMonitoring();
      }
      
      // Hacer una petición para obtener el contenido de la sección
      const response = await fetch(`/partials/sections/${sectionName}-section`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la sección: ${response.status}`);
      }
      
      const sectionContent = await response.text();
      
      // Actualizar la URL sin recargar la página
      window.history.pushState({section: sectionName}, '', `/dashboard/${sectionName}`);
      
      // Actualizar el contenido principal
      mainContent.innerHTML = sectionContent;
      
      // Activar la sección cargada
      const sectionElement = mainContent.querySelector('.section-content');
      if (sectionElement) {
        sectionElement.classList.add('active');
        // Asegurar que el elemento sea visible inmediatamente
        sectionElement.style.display = 'block';
      }
      
      // Remover clase active de todas las secciones existentes
      document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active');
      });
      
      // Actualizar la clase activa en los botones de navegación
      navButtons.forEach(btn => {
        if (btn.dataset.section === sectionName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      
      // Inicializar eventos para los nuevos elementos cargados después de un pequeño delay
      // para asegurar que la sección esté completamente visible
      setTimeout(() => {
        initSectionEvents();
      }, 100);
      
    } catch (error) {
      console.error('Error:', error);
      mainContent.innerHTML = `<div class="error-message">Error al cargar la sección. Por favor, intenta de nuevo.</div>`;
    }
  }
  
  // Inicializar eventos para elementos dentro de las secciones
  function initSectionEvents() {
    // Botones de añadir tarea
    const addTaskButtons = document.querySelectorAll('.add-task-btn');
    addTaskButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        alert('Funcionalidad para añadir tarea en desarrollo');
      });
    });
    
    // Los botones de añadir evento son manejados por la clase Calendar
    // No necesitamos sobrescribir sus event listeners aquí
    
    // Inicializar calendario si existe el elemento
    const calendarWidget = document.getElementById('calendar-widget');
    if (calendarWidget) {
      // Asegurar que la sección del calendario esté visible
      const calendarSection = document.querySelector('.calendar-section');
      if (calendarSection) {
        calendarSection.classList.add('active');
        calendarSection.style.display = 'block';
        calendarSection.style.visibility = 'visible';
        calendarSection.style.opacity = '1';
      }
      
      // Asegurar que el widget del calendario esté visible
      calendarWidget.style.display = 'block';
      calendarWidget.style.visibility = 'visible';
      calendarWidget.style.opacity = '1';
      
      // Destruir instancia anterior si existe
      if (window.berryCalendar) {
        window.berryCalendar = null;
      }
      
      // Usar la función de inicialización del calendario si está disponible
      if (typeof initializeCalendar === 'function') {
        initializeCalendar();
      } else {
        // Fallback: crear nueva instancia del calendario directamente
        window.berryCalendar = new Calendar('calendar-widget');
      }
      
      // Verificación adicional para Vercel: asegurar que el contenido se mantenga
       setTimeout(() => {
         if (calendarWidget && !calendarWidget.innerHTML.trim()) {
           console.warn('Calendar widget is empty, reinitializing...');
           if (window.berryCalendar) {
             window.berryCalendar.render();
             window.berryCalendar.attachEventListeners();
           }
         }
         
         // Iniciar monitoreo del calendario después de un delay para permitir renderizado completo
         if (typeof window.startCalendarMonitoring === 'function') {
           setTimeout(() => {
             window.startCalendarMonitoring();
           }, 2000);
         }
       }, 100);
    }
    
    // Botones de editar tarea
    const editButtons = document.querySelectorAll('.task-edit');
    editButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const taskItem = this.closest('.task-item');
        const taskTitle = taskItem.querySelector('h3').textContent;
        alert(`Editar tarea: ${taskTitle}`);
      });
    });
    
    // Botones de eliminar tarea
    const deleteButtons = document.querySelectorAll('.task-delete');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const taskItem = this.closest('.task-item');
        const taskTitle = taskItem.querySelector('h3').textContent;
        if (confirm(`¿Estás seguro de que deseas eliminar la tarea: ${taskTitle}?`)) {
          taskItem.style.opacity = '0';
          setTimeout(() => {
            taskItem.remove();
          }, 300);
        }
      });
    });
  }
  
  // Añadir eventos a los botones de navegación
  navButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.dataset.section;
      
      // Actualizar la clase activa
      navButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Cargar la sección correspondiente y actualizar la URL
      loadSection(section);
    });
  });
  
  // Añadir eventos a las tarjetas
  cards.forEach(card => {
    card.addEventListener('click', function() {
      const section = this.dataset.section;
      loadSection(section);
    });
  });
  
  // Inicializar el dashboard o cargar la sección activa
  if (activeSection) {
    loadSection(activeSection);
  } else {
    showDashboard();
  }
  
  // La funcionalidad del calendario ha sido eliminada
  
  // Añadir eventos a los botones de las tarjetas si existen
  const cardButtons = document.querySelectorAll('.card-button');
  if (cardButtons && cardButtons.length > 0) {
    cardButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const section = this.dataset.section;
        loadSection(section);
      });
    });
  }
  
  // Función para mostrar el contenido principal con las cards
  function showMainCards() {
    // Detener monitoreo del calendario si está activo
    if (typeof window.stopCalendarMonitoring === 'function') {
      window.stopCalendarMonitoring();
    }
    
    // Obtener el contenido original del dashboard con las cards
    fetch('/dashboard')
      .then(response => response.text())
      .then(html => {
        // Crear un elemento temporal para extraer el contenido principal
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const mainContent = tempDiv.querySelector('#main-content').innerHTML;
        
        // Actualizar el contenido principal
        document.getElementById('main-content').innerHTML = mainContent;
        
        // Reinicializar los eventos de los botones de las cards
        const newCardButtons = document.querySelectorAll('.card-btn');
        newCardButtons.forEach(btn => {
          btn.addEventListener('click', function() {
            const section = this.dataset.section;
            loadSection(section);
          });
        });
      })
      .catch(error => {
        console.error('Error al cargar el contenido principal:', error);
      });
  }
  
  // Añadir evento al header del sidebar para mostrar las cards
  sidebarHeader.addEventListener('click', function() {
    showMainCards();
    
    // Quitar la clase active de todos los botones de navegación
    navButtons.forEach(btn => {
      btn.classList.remove('active');
    });
  });
});
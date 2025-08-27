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
      // Hacer una petición para obtener el contenido de la sección
      const response = await fetch(`/partials/${sectionName}-section`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la sección: ${response.status}`);
      }
      
      const sectionContent = await response.text();
      
      // Actualizar el contenido principal
      mainContent.innerHTML = sectionContent;
      
      // Actualizar la clase activa en los botones de navegación
      navButtons.forEach(btn => {
        if (btn.dataset.section === sectionName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      
      // Inicializar eventos para los nuevos elementos cargados
      initSectionEvents();
      
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
    
    // Botones de añadir evento (para la sección de calendario)
    const addEventButtons = document.querySelectorAll('.add-event-btn');
    addEventButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        alert('Funcionalidad para añadir evento en desarrollo');
      });
    });
    
    // Inicializar calendario si estamos en la sección de calendario
    if (document.querySelector('.calendar-section')) {
      initCalendar();
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
  
  // Función para inicializar el calendario
  function initCalendar() {
    const calendarDays = document.querySelector('.calendar-days');
    const currentMonthElement = document.querySelector('.current-month');
    const prevMonthBtn = document.querySelector('.prev-month');
    const nextMonthBtn = document.querySelector('.next-month');
    
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // Función para actualizar el calendario
    function updateCalendar() {
      // Actualizar el título del mes
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      
      // Limpiar días existentes
      calendarDays.innerHTML = '';
      
      // Obtener el primer día del mes
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      
      // Obtener el último día del mes
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Obtener el último día del mes anterior
      const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
      
      // Añadir días del mes anterior
      for (let i = firstDay; i > 0; i--) {
        const day = document.createElement('div');
        day.classList.add('day', 'prev-month');
        day.textContent = prevMonthLastDay - i + 1;
        calendarDays.appendChild(day);
      }
      
      // Añadir días del mes actual
      for (let i = 1; i <= lastDay; i++) {
        const day = document.createElement('div');
        day.classList.add('day');
        day.textContent = i;
        
        // Marcar el día actual
        if (i === currentDate.getDate() && currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear()) {
          day.classList.add('today');
        }
        
        // Ejemplo: marcar algunos días con eventos (esto se podría cargar desde una API)
        if ((i === 4 || i === 15 || i === 18) && currentMonth === currentDate.getMonth()) {
          day.classList.add('has-events');
        }
        
        calendarDays.appendChild(day);
      }
      
      // Añadir días del mes siguiente (para completar la última fila)
      const totalDaysDisplayed = firstDay + lastDay;
      const nextMonthDays = 42 - totalDaysDisplayed; // 6 filas x 7 días = 42
      
      for (let i = 1; i <= nextMonthDays; i++) {
        const day = document.createElement('div');
        day.classList.add('day', 'next-month');
        day.textContent = i;
        calendarDays.appendChild(day);
      }
    }
    
    // Inicializar el calendario
    updateCalendar();
    
    // Eventos para los botones de navegación
    prevMonthBtn.addEventListener('click', function() {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      updateCalendar();
    });
    
    nextMonthBtn.addEventListener('click', function() {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      updateCalendar();
    });
  }
  
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
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const mainContent = document.getElementById('main-content');
  const navButtons = document.querySelectorAll('.nav-btn');
  const cardButtons = document.querySelectorAll('.card-btn');
  const sidebarHeader = document.querySelector('.sidebar-header');
  
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
  
  // Añadir eventos a los botones de las tarjetas
  cardButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const section = this.dataset.section;
      loadSection(section);
    });
  });
  
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
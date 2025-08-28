class Calendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.events = [];
        this.draggedEvent = null;
        // Week start preference: 'sunday' or 'monday'
        this.weekStart = this.detectInitialWeekStart();
        // Cargar eventos guardados
        this.loadEventsFromStorage();
        this.init();
    }

    detectInitialWeekStart(){
        // Read from cookies/localStorage or detect system
        const getCookie = (name)=>{
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
              let c = ca[i];
              while (c.charAt(0) === ' ') c = c.substring(1, c.length);
              if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        };
        let pref = getCookie('weekStart');
        if (!pref){
            try { pref = localStorage.getItem('weekStart'); } catch(e){ pref = null; }
        }
        if (!pref || pref === 'system'){
            try {
                const region = Intl.DateTimeFormat().resolvedOptions().locale;
                const sundayLocales = [/^en-US/i, /^en-CA/i, /^en-AU/i, /^en-PH/i];
                const isSunday = sundayLocales.some(r => r.test(region));
                return isSunday ? 'sunday' : 'monday';
            } catch(e){
                return 'monday';
            }
        }
        return pref;
    }

    setWeekStart(pref){
        // Accept 'sunday' or 'monday'
        if (pref !== 'sunday' && pref !== 'monday') return;
        this.weekStart = pref;
        this.render();
        this.attachEventListeners();
    }

    setupDateSelectors() {
        const yearSelector = document.getElementById('yearSelector');
        const monthSelector = document.getElementById('monthSelector');
        
        if (yearSelector) {
            // Generar opciones de años (limitado entre 1800 y 2150 por rendimiento)
            const currentYear = new Date().getFullYear();
            const minYear = 1800;
            const maxYear = 2150;
            yearSelector.innerHTML = '';
            for (let year = minYear; year <= maxYear; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelector.appendChild(option);
            }
            
            // Event listener para cambio de año
            yearSelector.addEventListener('change', (e) => {
                this.currentDate.setFullYear(parseInt(e.target.value));
                this.render();
                this.attachEventListeners();
                document.getElementById('dateSelectors').style.display = 'none';
            });
        }
        
        if (monthSelector) {
            // Event listener para cambio de mes
            monthSelector.addEventListener('change', (e) => {
                this.currentDate.setMonth(parseInt(e.target.value));
                this.render();
                this.attachEventListeners();
                document.getElementById('dateSelectors').style.display = 'none';
            });
        }
    }

    updateSelectorValues() {
        const yearSelector = document.getElementById('yearSelector');
        const monthSelector = document.getElementById('monthSelector');
        
        if (yearSelector) {
            yearSelector.value = this.currentDate.getFullYear();
        }
        if (monthSelector) {
            monthSelector.value = this.currentDate.getMonth();
        }
    }

    init() {
        this.render();
         this.attachEventListeners();

    }

    render() {
        const weekdayLabels = this.weekStart === 'monday'
          ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
          : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const weekdaysHTML = weekdayLabels.map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
        const calendarHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" id="prevMonth"><i class="fas fa-chevron-up"></i></button>
                    <div class="calendar-title-container">
                        <h2 class="calendar-title" id="calendarTitle">${this.getMonthYear()}</h2>
                        <div class="calendar-date-selectors" id="dateSelectors" style="display: none;">
                            <select id="monthSelector" class="calendar-selector">
                                <option value="0">Enero</option>
                                <option value="1">Febrero</option>
                                <option value="2">Marzo</option>
                                <option value="3">Abril</option>
                                <option value="4">Mayo</option>
                                <option value="5">Junio</option>
                                <option value="6">Julio</option>
                                <option value="7">Agosto</option>
                                <option value="8">Septiembre</option>
                                <option value="9">Octubre</option>
                                <option value="10">Noviembre</option>
                                <option value="11">Diciembre</option>
                            </select>
                            <select id="yearSelector" class="calendar-selector"></select>
                        </div>
                    </div>
                    <button class="calendar-nav-btn" id="nextMonth"><i class="fas fa-chevron-down"></i></button>
                </div>
                <div class="calendar-weekdays">
                    ${weekdaysHTML}
                </div>
                <div class="calendar-grid" id="calendarGrid">
                    ${this.generateCalendarDays()}
                </div>
                <div class="calendar-event-form" id="eventForm" style="display: none;">
                    <h3>Agregar Evento</h3>
                    <input type="text" id="eventTitle" placeholder="Título del evento">
                    <input type="time" id="eventTime">
                    <button id="saveEvent">Guardar</button>
                    <button id="cancelEvent">Cancelar</button>
                </div>
            </div>
            
            <!-- Modal para crear eventos -->
            <div class="event-modal" id="eventModal">
                <div class="event-modal-content">
                    <div class="event-modal-header">
                        <h3 class="event-modal-title">Crear Evento</h3>
                        <button class="event-modal-close" id="closeEventModal">&times;</button>
                    </div>
                    <form class="event-modal-form" id="eventModalForm">
                        <input type="text" id="modalEventTitle" placeholder="Título del evento" required>
                        <input type="date" id="modalEventDate" required>
                        <input type="time" id="modalEventTime">
                        <textarea id="modalEventDescription" placeholder="Descripción (opcional)" rows="4"></textarea>
                        <div class="event-modal-buttons">
                            <button type="button" class="event-modal-btn event-modal-btn-secondary" id="cancelEventModal">Cancelar</button>
                            <button type="submit" class="event-modal-btn event-modal-btn-primary">Crear Evento</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        this.container.innerHTML = calendarHTML;
    }

    getMonthYear() {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }

    generateCalendarDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        let firstDay = new Date(year, month, 1).getDay(); // 0 Sunday .. 6 Saturday
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Adjust firstDay index based on weekStart
        // If monday start, transform: 0(Sun)->6, 1(Mon)->0, ..., 6(Sat)->5
        if (this.weekStart === 'monday'){
            firstDay = (firstDay + 6) % 7;
        }

        let daysHTML = '';

        // Días del mes anterior
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = this.events.filter(event => event.date === dateStr);
            const eventsHTML = dayEvents.map(event => 
                `<div class="calendar-event" draggable="true" data-event-id="${event.id}">
                    <span class="calendar-event-title">${event.title}</span>
                    <span class="calendar-event-time">${event.time}</span>
                </div>`
            ).join('');
            daysHTML += `
                <div class="calendar-day calendar-day-other-month" data-date="${dateStr}">
                    <button class="add-event-btn" data-date="${dateStr}">+</button>
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events">${eventsHTML}</div>
                </div>
            `;
        }

        // Días del mes actual
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = this.events.filter(event => event.date === dateStr);
            const eventsHTML = dayEvents.map(event => 
                `<div class="calendar-event" draggable="true" data-event-id="${event.id}">
                    <span class="calendar-event-title">${event.title}</span>
                    <span class="calendar-event-time">${event.time}</span>
                </div>`
            ).join('');
            
            daysHTML += `
                <div class="calendar-day" data-date="${dateStr}">
                    <button class="add-event-btn" data-date="${dateStr}">+</button>
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events">${eventsHTML}</div>
                </div>
            `;
        }

        // Días del mes siguiente
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = this.events.filter(event => event.date === dateStr);
            const eventsHTML = dayEvents.map(event => 
                `<div class="calendar-event" draggable="true" data-event-id="${event.id}">
                    <span class="calendar-event-title">${event.title}</span>
                    <span class="calendar-event-time">${event.time}</span>
                </div>`
            ).join('');
            daysHTML += `
                <div class="calendar-day calendar-day-other-month" data-date="${dateStr}">
                    <button class="add-event-btn" data-date="${dateStr}">+</button>
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events">${eventsHTML}</div>
                </div>
            `;
        }

        return daysHTML;
    }

    attachEventListeners() {
        // Navegación de meses
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render();
                this.attachEventListeners();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.render();
                this.attachEventListeners();
            });
        }

        // Navegación con scroll del mouse
        const calendarContainer = this.container.querySelector('.calendar-container');
        if (calendarContainer) {
            // Variables para controlar el scroll suave
            let scrollTimeout = null;
            let isScrolling = false;
            
            calendarContainer.addEventListener('wheel', (e) => {
                e.preventDefault(); // Prevenir el scroll normal de la página
                
                // Evitar múltiples cambios mientras se está procesando uno
                if (isScrolling) return;
                
                // Throttling para evitar cambios demasiado rápidos
                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }
                
                scrollTimeout = setTimeout(() => {
                    isScrolling = true;
                    
                    // Añadir efecto de fade out
                    const calendarGrid = this.container.querySelector('.calendar-grid');
                    if (calendarGrid) {
                        calendarGrid.style.opacity = '0.7';
                        calendarGrid.style.transform = 'translateY(10px)';
                    }
                    
                    // Cambiar mes después de un pequeño delay para el efecto visual
                    setTimeout(() => {
                        if (e.deltaY > 0) {
                            // Scroll hacia abajo - mes siguiente
                            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                        } else {
                            // Scroll hacia arriba - mes anterior
                            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                        }
                        
                        this.render();
                        this.attachEventListeners();
                        
                        // Restaurar el efecto visual
                        setTimeout(() => {
                            const newCalendarGrid = this.container.querySelector('.calendar-grid');
                            if (newCalendarGrid) {
                                newCalendarGrid.style.opacity = '1';
                                newCalendarGrid.style.transform = 'translateY(0)';
                            }
                            isScrolling = false;
                        }, 50);
                    }, 100);
                }, 100); // Delay reducido para mayor responsividad
            });
        }



        // Toggle selectors al hacer clic en el título
        const title = document.getElementById('calendarTitle');
        const selectors = document.getElementById('dateSelectors');
        if (title && selectors) {
            title.addEventListener('click', () => {
                selectors.style.display = selectors.style.display === 'none' ? 'flex' : 'none';
                if (selectors.style.display === 'flex') {
                    this.updateSelectorValues();
                    this.setupDateSelectors();
                }
            });

            // Cerrar selectores al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!selectors.contains(e.target) && e.target !== title) {
                    selectors.style.display = 'none';
                }
            });
        }

        // Eventos para la creación de eventos
        const calendarGrid = document.getElementById('calendarGrid');
        if (calendarGrid) {
            calendarGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-event-btn')) {
                    const date = e.target.getAttribute('data-date');
                    this.showEventModal(date);
                }
            });
            
            // Habilitar arrastrar y soltar eventos
            calendarGrid.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('calendar-event')) {
                    this.draggedEvent = e.target;
                    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-event-id'));
                    // Añadir clase para indicar que se está arrastrando
                    e.target.classList.add('dragging');
                }
            });

            calendarGrid.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('calendar-event')) {
                    e.target.classList.remove('dragging');
                    // Remover todas las clases de drag-over
                    document.querySelectorAll('.calendar-day-drag-over').forEach(day => {
                        day.classList.remove('calendar-day-drag-over');
                    });
                }
            });

            calendarGrid.addEventListener('dragover', (e) => {
                e.preventDefault();
                const targetDay = e.target.closest('.calendar-day');
                if (targetDay) {
                    // Remover clase de todos los días
                    document.querySelectorAll('.calendar-day-drag-over').forEach(day => {
                        day.classList.remove('calendar-day-drag-over');
                    });
                    // Añadir clase al día actual
                    targetDay.classList.add('calendar-day-drag-over');
                }
            });

            calendarGrid.addEventListener('dragleave', (e) => {
                const targetDay = e.target.closest('.calendar-day');
                if (targetDay && !targetDay.contains(e.relatedTarget)) {
                    targetDay.classList.remove('calendar-day-drag-over');
                }
            });

            calendarGrid.addEventListener('drop', (e) => {
                e.preventDefault();
                const eventId = e.dataTransfer.getData('text/plain');
                const targetDay = e.target.closest('.calendar-day');
                if (targetDay) {
                    const newDate = targetDay.getAttribute('data-date');
                    this.moveEvent(eventId, newDate);
                    // Remover clase de drag-over
                    targetDay.classList.remove('calendar-day-drag-over');
                }
            });
        }

        // Modal events
        const modal = document.getElementById('eventModal');
        const closeModalBtn = document.getElementById('closeEventModal');
        const cancelEventModalBtn = document.getElementById('cancelEventModal');
        const eventModalForm = document.getElementById('eventModalForm');

        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.hideEventModal());
        if (cancelEventModalBtn) cancelEventModalBtn.addEventListener('click', () => this.hideEventModal());
        if (eventModalForm) eventModalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEventFromModal();
        });
    }

    showEventModal(date) {
        const modal = document.getElementById('eventModal');
        const dateInput = document.getElementById('modalEventDate');
        
        if (modal && dateInput) {
            dateInput.value = date;
            modal.classList.add('show');
            modal.style.display = 'flex';
            
            // Focus en el campo de título
            const titleInput = document.getElementById('modalEventTitle');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }
        }
    }

    hideEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            
            // Limpiar el formulario
            const form = document.getElementById('eventModalForm');
            if (form) {
                form.reset();
            }
        }
    }

    saveEventFromModal() {
        const title = document.getElementById('modalEventTitle').value.trim();
        const date = document.getElementById('modalEventDate').value;
        const time = document.getElementById('modalEventTime').value || '00:00';
        const description = document.getElementById('modalEventDescription').value.trim();
        
        if (!title || !date) {
            alert('Por favor, completa el título y la fecha del evento.');
            return;
        }
        
        // Crear el evento
        const event = {
            id: Date.now().toString(), // ID único basado en timestamp
            title: title,
            date: date,
            time: time,
            description: description
        };
        
        // Añadir el evento a la lista
        this.events.push(event);
        
        // Guardar en localStorage para persistencia
        this.saveEventsToStorage();
        
        // Cerrar modal y re-renderizar calendario
        this.hideEventModal();
        this.render();
        this.attachEventListeners();
    }

    moveEvent(eventId, newDate) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.date = newDate;
            this.saveEventsToStorage();
            this.render();
            this.attachEventListeners();
        }
    }

    saveEventsToStorage() {
        try {
            localStorage.setItem('berryCalendarEvents', JSON.stringify(this.events));
        } catch (error) {
            console.warn('No se pudieron guardar los eventos en localStorage:', error);
        }
    }

    loadEventsFromStorage() {
        try {
            const savedEvents = localStorage.getItem('berryCalendarEvents');
            if (savedEvents) {
                this.events = JSON.parse(savedEvents);
            }
        } catch (error) {
            console.warn('No se pudieron cargar los eventos desde localStorage:', error);
            this.events = [];
        }
    }

    addEvent(title, date, time = '00:00', description = '') {
        const event = {
            id: Date.now().toString(),
            title: title,
            date: date,
            time: time,
            description: description
        };
        
        this.events.push(event);
        this.saveEventsToStorage();
        this.render();
        this.attachEventListeners();
        
        return event;
    }

    removeEvent(eventId) {
        this.events = this.events.filter(event => event.id !== eventId);
        this.saveEventsToStorage();
        this.render();
        this.attachEventListeners();
    }
}

// Inicializar el calendario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('calendar-widget')) {
        window.berryCalendar = new Calendar('calendar-widget');
        
        // Configurar fecha actual en el formulario de actividades
        const today = new Date().toISOString().split('T')[0];
        const activityDateInput = document.getElementById('activity-date');
        if (activityDateInput && !activityDateInput.value) {
            activityDateInput.value = today;
        }
    }
});
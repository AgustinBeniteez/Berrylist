class Calendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Calendar container with ID '${containerId}' not found`);
            return;
        }
        
        // Mostrar indicador de carga
        this.showLoadingIndicator();
        
        this.currentDate = new Date();
        this.events = [];
        this.draggedEvent = null;
        // Week start preference: 'sunday' or 'monday'
        this.weekStart = this.detectInitialWeekStart();
        // Load saved events
        this.loadEventsFromStorage();
        
        // Renderizar inmediatamente
        this.init();
    }
    
    showLoadingIndicator() {
        this.container.innerHTML = `
            <div class="calendar-loading">
                <div class="loading-spinner"></div>
                <p>Cargando calendario...</p>
            </div>
        `;
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
            // Generate year options (limited between 1800 and 2150 for performance)
            const currentYear = new Date().getFullYear();
            const minYear = 2020;
            const maxYear = 2150;
            yearSelector.innerHTML = '';
            for (let year = minYear; year <= maxYear; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelector.appendChild(option);
            }
            
            // Event listener for year change
            yearSelector.addEventListener('change', (e) => {
                this.currentDate.setFullYear(parseInt(e.target.value));
                this.render();
                this.attachEventListeners();
                document.getElementById('dateSelectors').style.display = 'none';
            });
        }
        
        if (monthSelector) {
            // Event listener for month change
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
                                <option value="0">January</option>
                                <option value="1">February</option>
                                <option value="2">March</option>
                                <option value="3">April</option>
                                <option value="4">May</option>
                                <option value="5">June</option>
                                <option value="6">July</option>
                                <option value="7">August</option>
                                <option value="8">September</option>
                                <option value="9">October</option>
                                <option value="10">November</option>
                                <option value="11">December</option>
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
                    <h3>Add Event</h3>
                    <input type="text" id="eventTitle" placeholder="Event title">
                    <input type="time" id="eventTime">
                    <button id="saveEvent">Save</button>
                    <button id="cancelEvent">Close</button>
                </div>
            </div>
            
            <!-- Modal for creating events -->
            <div class="event-modal" id="eventModal">
                <div class="event-modal-content">
                    <div class="event-modal-header">
                        <h3 class="event-modal-title">Create Event</h3>
                        <button class="event-modal-close" id="closeEventModal">&times;</button>
                    </div>
                    <form class="event-modal-form" id="eventModalForm">
                        <input type="text" id="modalEventTitle" placeholder="Event title" required>
                        <input type="date" id="modalEventDate" required>
                        <input type="time" id="modalEventTime">
                        <textarea id="modalEventDescription" placeholder="Description (optional)" rows="4"></textarea>
                        <div class="event-modal-buttons">
                            <button type="button" class="event-modal-btn event-modal-btn-secondary" id="cancelEventModal">Cancel</button>
                            <button type="submit" class="event-modal-btn event-modal-btn-primary">Create Event</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        this.container.innerHTML = calendarHTML;
        
        // Asegurar visibilidad inmediata
        const container = this.container;
        if (container) {
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            
            const calendarContainer = container.querySelector('.calendar-container');
            if (calendarContainer) {
                calendarContainer.style.display = 'block';
                calendarContainer.style.visibility = 'visible';
                calendarContainer.style.opacity = '1';
            }
        }
    }

    getMonthYear() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
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

        // Days from previous month
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

        // Days from current month
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

        // Days from next month
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
        // Month navigation
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
            // Variables to control smooth scroll
            let scrollTimeout = null;
            let isScrolling = false;
            
            calendarContainer.addEventListener('wheel', (e) => {
                e.preventDefault(); // Prevent normal page scroll
                
                // Avoid multiple changes while processing one
                if (isScrolling) return;
                
                // Throttling to avoid too rapid changes
                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }
                
                scrollTimeout = setTimeout(() => {
                    isScrolling = true;
                    
                    // Add fade out effect
                    const calendarGrid = this.container.querySelector('.calendar-grid');
                    if (calendarGrid) {
                        calendarGrid.style.opacity = '0.7';
                        calendarGrid.style.transform = 'translateY(10px)';
                    }
                    
                    // Change month after a small delay for visual effect
                    setTimeout(() => {
                        if (e.deltaY > 0) {
                            // Scroll down - next month
                            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                        } else {
                            // Scroll up - previous month
                            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                        }
                        
                        this.render();
                        this.attachEventListeners();
                        
                        // Restore visual effect
                        setTimeout(() => {
                            const newCalendarGrid = this.container.querySelector('.calendar-grid');
                            if (newCalendarGrid) {
                                newCalendarGrid.style.opacity = '1';
                                newCalendarGrid.style.transform = 'translateY(0)';
                            }
                            isScrolling = false;
                        }, 50);
                    }, 100);
                }, 100); // Reduced delay for better responsiveness
            });
        }



        // Toggle selectors when clicking on title
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

            // Close selectors when clicking outside
            document.addEventListener('click', (e) => {
                if (!selectors.contains(e.target) && e.target !== title) {
                    selectors.style.display = 'none';
                }
            });
        }

        // Events for event creation
        const calendarGrid = document.getElementById('calendarGrid');
        if (calendarGrid) {
            calendarGrid.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-event-btn')) {
                    const date = e.target.getAttribute('data-date');
                    this.showEventModal(date);
                }
            });
            
            // Enable drag and drop events
            calendarGrid.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('calendar-event')) {
                    this.draggedEvent = e.target;
                    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-event-id'));
                    // Add class to indicate dragging
                    e.target.classList.add('dragging');
                }
            });

            calendarGrid.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('calendar-event')) {
                    e.target.classList.remove('dragging');
                    // Remove all drag-over classes
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
                    // Add class to current day
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
                    // Remove drag-over class
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
            
            // Focus on the title field
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
            
            // Clear the form
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
            alert('Please complete the event title and date.');
            return;
        }
        
        // Create the event
        const event = {
            id: Date.now().toString(), // Unique ID based on timestamp
            title: title,
            date: date,
            time: time,
            description: description
        };
        
        // Add the event to the list
        this.events.push(event);
        
        // Save to localStorage for persistence
        this.saveEventsToStorage();
        
        // Close modal and re-render calendar
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
            console.warn('Could not save events to localStorage:', error);
        }
    }

    loadEventsFromStorage() {
        try {
            const savedEvents = localStorage.getItem('berryCalendarEvents');
            if (savedEvents) {
                this.events = JSON.parse(savedEvents);
            }
        } catch (error) {
            console.warn('Could not load events from localStorage:', error);
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

// Initialize calendar when DOM is ready
// This function can be called from dashboard.js to avoid conflicts
function initializeCalendar() {
    const calendarWidget = document.getElementById('calendar-widget');
    
    // Destruir instancia existente si existe
    if (window.berryCalendar) {
        console.log('Destroying existing calendar instance');
        window.berryCalendar = null;
    }
    
    if (calendarWidget) {
        // Ensure the calendar container is visible
        calendarWidget.style.display = 'block';
        calendarWidget.style.visibility = 'visible';
        calendarWidget.style.opacity = '1';
        
        // Crear nueva instancia (el constructor ya maneja el loading)
        window.berryCalendar = new Calendar('calendar-widget');
        console.log('Calendar initialized successfully');
        
        // Set current date in the activities form
        const today = new Date().toISOString().split('T')[0];
        const activityDateInput = document.getElementById('activity-date');
        if (activityDateInput && !activityDateInput.value) {
            activityDateInput.value = today;
        }
        
        return true;
    }
    console.warn('Calendar widget not found');
    return false;
}

// Auto-initialize if not in dashboard context
document.addEventListener('DOMContentLoaded', function() {
    // Only auto-initialize if we're not in a dashboard context
    if (!document.querySelector('.dashboard-page')) {
        initializeCalendar();
    }
});

// Verificación adicional para Vercel: monitorear si el calendario desaparece
if (typeof window !== 'undefined') {
    let calendarCheckInterval;
    let reinitializationCount = 0;
    const MAX_REINITIALIZATIONS = 3;
    
    function startCalendarMonitoring() {
        // Resetear contador al iniciar monitoreo
        reinitializationCount = 0;
        let lastCheckTime = Date.now();
        
        calendarCheckInterval = setInterval(() => {
            const calendarWidget = document.getElementById('calendar-widget');
            const calendarSection = document.querySelector('.calendar-section');
            
            // Solo verificar si estamos en la sección del calendario
            if (!calendarSection || !calendarSection.classList.contains('active')) {
                return;
            }
            
            // Verificar si el widget existe y está realmente vacío
            if (calendarWidget) {
                const isEmpty = !calendarWidget.innerHTML.trim();
                const isHidden = calendarWidget.style.display === 'none';
                const hasCalendarContent = calendarWidget.querySelector('.calendar-container');
                const isLoading = calendarWidget.querySelector('.calendar-loading');
                
                // Solo reinicializar si está vacío, no tiene contenido del calendario y no está cargando
                if ((isEmpty || isHidden) && !hasCalendarContent && !isLoading) {
                    // Esperar menos tiempo para verificación más rápida
                    const timeSinceLastCheck = Date.now() - lastCheckTime;
                    if (timeSinceLastCheck < 1000) {
                        return; // Muy pronto para verificar
                    }
                    
                    if (reinitializationCount >= MAX_REINITIALIZATIONS) {
                        console.warn('Maximum reinitializations reached, stopping monitoring');
                        stopCalendarMonitoring();
                        return;
                    }
                    
                    console.warn(`Calendar widget disappeared, reinitializing... (${reinitializationCount + 1}/${MAX_REINITIALIZATIONS})`);
                    reinitializationCount++;
                    lastCheckTime = Date.now();
                    
                    // Reinicializar completamente
                    initializeCalendar();
                }
            }
        }, 2000); // Reducir intervalo a 2 segundos para mejor responsividad
    }
    
    function stopCalendarMonitoring() {
        if (calendarCheckInterval) {
            clearInterval(calendarCheckInterval);
            calendarCheckInterval = null;
            reinitializationCount = 0;
            console.log('Calendar monitoring stopped');
        }
    }
    
    // Exponer funciones globalmente
    window.startCalendarMonitoring = startCalendarMonitoring;
    window.stopCalendarMonitoring = stopCalendarMonitoring;
    
    // Iniciar monitoreo cuando se carga la página (solo si no es dashboard)
    document.addEventListener('DOMContentLoaded', () => {
        const calendarWidget = document.getElementById('calendar-widget');
        const isDashboard = document.querySelector('.dashboard-container') || document.querySelector('#content-area');
        
        // Solo iniciar monitoreo automático si no estamos en dashboard
        if (calendarWidget && !isDashboard) {
            startCalendarMonitoring();
        }
    });
    
    // Exponer funciones globalmente para uso en dashboard.js
    window.startCalendarMonitoring = startCalendarMonitoring;
    window.stopCalendarMonitoring = stopCalendarMonitoring;
}
class Calendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Calendar container with ID '${containerId}' not found`);
            return;
        }
        
        // Clear any existing localStorage data to prevent conflicts
        this.clearLocalStorage();
        
        // Mostrar indicador de carga
        this.showLoadingIndicator();
        
        this.currentDate = new Date();
        this.events = [];
        this.draggedEvent = null;
        this.realtimeListener = null;
        this.realtimeListenerRef = null;
        this.syncInterval = null;
        // Week start preference: 'sunday' or 'monday'
        this.weekStart = this.detectInitialWeekStart();
        // Current view state: 'month' or 'day'
        this.currentView = 'month';
        this.currentDetailDate = null;
        // Load saved events asynchronously
        this.initializeCalendar();
    }
    
    async initializeCalendar() {
        try {
            await this.loadEventsFromStorage();
            this.init();
        } catch (error) {
            console.warn('Error initializing calendar:', error);
            this.init(); // Initialize anyway with empty events
        }
    }
    
    showLoadingIndicator() {
        this.container.innerHTML = `
            <div class="calendar-loading">
                <div class="loading-spinner"></div>
                <p>Loading calendar...</p>
            </div>
        `;
    }

    hideLoadingIndicator() {
        // Si el calendario ya está renderizado, no hacemos nada
        if (this.container.querySelector('.calendar-container')) {
            return;
        }
        // Si no, re-renderizamos el calendario
        this.render();
        this.attachEventListeners();
    }

    clearLocalStorage() {
        try {
            // Remove old calendar data from localStorage to prevent conflicts
            localStorage.removeItem('berryCalendarEvents');
            console.log('Cleared localStorage calendar data');
        } catch (error) {
            console.warn('Could not clear localStorage:', error);
        }
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
        // Por defecto mostrar la vista del calendario mensual
        this.render();
        this.attachEventListeners();
    }

    render() {
        const weekdayLabels = window.i18n 
            ? window.i18n.t(`calendar.weekdays.${this.weekStart}`)
            : (this.weekStart === 'monday'
                ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
        const weekdaysHTML = weekdayLabels.map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
        const calendarHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <div class="calendar-left-section">
                        <button class="calendar-nav-btn" id="prevMonth"><i class="fas fa-chevron-left"></i></button>
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
                        <button class="calendar-nav-btn" id="nextMonth"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="calendar-right-section">
                        <button class="calendar-nav-btn" id="monthTasksBtn" title="Ver Tareas del Mes"><i class="fas fa-tasks"></i></button>
                        <button class="calendar-nav-btn" id="todayViewBtn" title="Ver día de hoy"><i class="fas fa-calendar-day"></i></button>
                    </div>
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
                        <div class="event-modal-actions">
                            <button type="submit" class="event-modal-btn event-modal-btn-primary" id="submitEventModal"><i class="fas fa-save"></i> ${window.i18n ? window.i18n.t('calendar.save') : 'Guardar'}</button>
                            <button type="button" class="event-modal-btn event-modal-btn-danger" id="deleteEventModal" style="display: none;" title="${window.i18n ? window.i18n.t('calendar.deleteEvent') : 'Delete Event'}"><i class="fas fa-trash-alt"></i></button>
                            <button type="button" class="event-modal-btn event-modal-btn-secondary" id="cancelEventModal" title="${window.i18n ? window.i18n.t('calendar.cancel') : 'Cancel'}"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    <form class="event-modal-form" id="eventModalForm">
                        <input type="text" id="modalEventTitle" placeholder="${window.i18n ? window.i18n.t('calendar.eventTitle') : 'Event title'}" required>
                        <textarea id="modalEventDescription" placeholder="${window.i18n ? window.i18n.t('calendar.eventDescription') : 'Description (optional)'}" rows="3"></textarea>
                        
                        <div class="event-date-type-container">
                            <div class="event-type-container">
                                <label>${window.i18n ? window.i18n.t('calendar.eventType') : 'Event type'}:</label>
                                <select id="modalEventType">
                                    <option value="other">${window.i18n ? window.i18n.t('calendar.eventTypes.other') : 'Other'}</option>
                                    <option value="work">${window.i18n ? window.i18n.t('calendar.eventTypes.work') : 'Work'}</option>
                                    <option value="study">${window.i18n ? window.i18n.t('calendar.eventTypes.study') : 'Study'}</option>
                                    <option value="leisure">${window.i18n ? window.i18n.t('calendar.eventTypes.leisure') : 'Leisure'}</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="appointment">Appointment</option>
                                    <option value="birthday">Birthday</option>
                                    <option value="holiday">Holiday</option>
                                </select>
                            </div>
                            <div class="event-date-container">
                                <label>${window.i18n ? window.i18n.t('calendar.date') : 'Date'}:</label>
                                <input type="date" id="modalEventDate" required>
                            </div>
                        </div>
                        
                        <div class="event-time-container">
                            <div class="time-checkbox-wrapper">
                                <input type="checkbox" id="eventHasTime" checked>
                                <label for="eventHasTime">${window.i18n ? window.i18n.t('calendar.setSpecificTime') : 'Set specific time'}</label>
                            </div>
                            <input type="time" id="modalEventTime">
                        </div>
                        
                        <div class="icon-picker-container">
                            <label>${window.i18n ? window.i18n.t('calendar.eventIcon') : 'Icon'}:</label>
                            <div class="icon-picker-grid">
                                <div class="icon-option active" data-icon="fas fa-calendar"><i class="fas fa-calendar"></i></div>
                                <div class="icon-option" data-icon="fas fa-briefcase"><i class="fas fa-briefcase"></i></div>
                                <div class="icon-option" data-icon="fas fa-book"><i class="fas fa-book"></i></div>
                                <div class="icon-option" data-icon="fas fa-gamepad"><i class="fas fa-gamepad"></i></div>
                                <div class="icon-option" data-icon="fas fa-coffee"><i class="fas fa-coffee"></i></div>
                                <div class="icon-option" data-icon="fas fa-heart"><i class="fas fa-heart"></i></div>
                                <div class="icon-option" data-icon="fas fa-star"><i class="fas fa-star"></i></div>
                                <div class="icon-option" data-icon="fas fa-music"><i class="fas fa-music"></i></div>
                                <div class="icon-option" data-icon="fas fa-film"><i class="fas fa-film"></i></div>
                                <div class="icon-option" data-icon="fas fa-plane"><i class="fas fa-plane"></i></div>
                                <div class="icon-option" data-icon="fas fa-utensils"><i class="fas fa-utensils"></i></div>
                                <div class="icon-option" data-icon="fas fa-dumbbell"><i class="fas fa-dumbbell"></i></div>
                                <div class="icon-option" data-icon="fas fa-birthday-cake"><i class="fas fa-birthday-cake"></i></div>
                                <div class="icon-option" data-icon="fas fa-code"><i class="fas fa-code"></i></div>
                                <div class="icon-option" data-icon="fas fa-laptop-code"><i class="fas fa-laptop-code"></i></div>
                                <div class="icon-option" data-icon="fas fa-graduation-cap"><i class="fas fa-graduation-cap"></i></div>
                                <div class="icon-option" data-icon="fas fa-users"><i class="fas fa-users"></i></div>
                                <div class="icon-option" data-icon="fas fa-shopping-cart"><i class="fas fa-shopping-cart"></i></div>
                                <div class="icon-option" data-icon="fas fa-medkit"><i class="fas fa-medkit"></i></div>
                                <div class="icon-option" data-icon="fas fa-gift"><i class="fas fa-gift"></i></div>
                                <div class="icon-option" data-icon="fas fa-car"><i class="fas fa-car"></i></div>
                                <div class="icon-option" data-icon="fas fa-home"><i class="fas fa-home"></i></div>
                                <div class="icon-option" data-icon="fas fa-glass-cheers"><i class="fas fa-glass-cheers"></i></div>
                                <div class="icon-option" data-icon="fas fa-baby"><i class="fas fa-baby"></i></div>
                                <div class="icon-option" data-icon="fas fa-trophy"><i class="fas fa-trophy"></i></div>
                                <div class="icon-option" data-icon="fas fa-camera"><i class="fas fa-camera"></i></div>
                                <div class="icon-option" data-icon="fas fa-bell"><i class="fas fa-bell"></i></div>
                                <div class="icon-option" data-icon="fas fa-paint-brush"><i class="fas fa-paint-brush"></i></div>
                                <div class="icon-option" data-icon="fas fa-bug"><i class="fas fa-bug"></i></div>
                                <div class="icon-option" data-icon="fas fa-cart-plus"><i class="fas fa-cart-plus"></i></div>
                                <div class="icon-option" data-icon="fas fa-truck"><i class="fas fa-truck"></i></div>
                                <div class="icon-option" data-icon="fas fa-stethoscope"><i class="fas fa-stethoscope"></i></div>
                                <div class="icon-option" data-icon="fas fa-wifi"><i class="fas fa-wifi"></i></div>
                                <div class="icon-option" data-icon="fas fa-phone"><i class="fas fa-phone"></i></div>
                                <div class="icon-option" data-icon="fas fa-keyboard"><i class="fas fa-keyboard"></i></div>
                            </div>
                            <input type="hidden" id="selectedEventIcon" value="fas fa-calendar">
                        </div>
                        
                        <div class="event-color-container">
                            <label>${window.i18n ? window.i18n.t('calendar.eventColor') : 'Color'}:</label>
                            <div class="color-picker-grid">
                                <div class="color-option" data-color="var(--event-color-1)" style="background-color: var(--event-color-1);"></div>
                                <div class="color-option" data-color="var(--event-color-2)" style="background-color: var(--event-color-2);"></div>
                                <div class="color-option" data-color="var(--event-color-3)" style="background-color: var(--event-color-3);"></div>
                                <div class="color-option" data-color="var(--event-color-4)" style="background-color: var(--event-color-4);"></div>
                                <div class="color-option" data-color="var(--event-color-5)" style="background-color: var(--event-color-5);"></div>
                                <div class="color-option" data-color="var(--event-color-6)" style="background-color: var(--event-color-6);"></div>
                                <div class="color-option" data-color="var(--event-color-7)" style="background-color: var(--event-color-7);"></div>
                                <div class="color-option" data-color="var(--event-color-8)" style="background-color: var(--event-color-8);"></div>
                                <div class="color-option" data-color="var(--event-color-9)" style="background-color: var(--event-color-9);"></div>
                                <div class="color-option" data-color="var(--event-color-10)" style="background-color: var(--event-color-10);"></div>
                                <div class="color-option" data-color="var(--event-color-11)" style="background-color: var(--event-color-11);"></div>
                                <div class="color-option" data-color="var(--event-color-12)" style="background-color: var(--event-color-12);"></div>
                                <div class="color-option" data-color="var(--event-custom-1)" style="background-color: var(--event-custom-1);"></div>
                                <div class="color-option" data-color="var(--event-custom-2)" style="background-color: var(--event-custom-2);"></div>
                                <div class="color-option" data-color="var(--event-custom-3)" style="background-color: var(--event-custom-3);"></div>
                                <div class="color-option" data-color="var(--event-custom-4)" style="background-color: var(--event-custom-4);"></div>
                                <div class="color-option" data-color="var(--event-custom-5)" style="background-color: var(--event-custom-5);"></div>
                                <div class="color-option" data-color="var(--event-custom-6)" style="background-color: var(--event-custom-6);"></div>
                                <div class="color-option" data-color="var(--event-custom-7)" style="background-color: var(--event-custom-7);"></div>
                                <div class="color-option" data-color="var(--event-custom-8)" style="background-color: var(--event-custom-8);"></div>
                                <div class="color-option" data-color="var(--event-custom-9)" style="background-color: var(--event-custom-9);"></div>
                                <div class="color-option" data-color="var(--event-custom-10)" style="background-color: var(--event-custom-10);"></div>
                                <div class="color-option" data-color="var(--event-custom-11)" style="background-color: var(--event-custom-11);"></div>
                                <div class="color-option" data-color="var(--event-custom-12)" style="background-color: var(--event-custom-12);"></div>
                            </div>
                            <input type="hidden" id="selectedEventColor" value="var(--event-default-color)">
                        </div>
                        

                    </form>
                </div>
            </div>
            
            <!-- Modal para mostrar tareas del mes -->
            <div class="month-tasks-modal" id="monthTasksModal" style="display: none;">
                <div class="month-tasks-modal-content">
                    <div class="month-tasks-modal-header">
                        <h3 class="month-tasks-modal-title">${window.i18n ? window.i18n.t('monthlyTasks') : 'Tareas del Mes'}</h3>
                        <button type="button" class="month-tasks-modal-close" id="closeMonthTasksModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="month-tasks-modal-body">
                        <div class="month-tasks-filter">
                            <button class="filter-btn active" data-filter="all">${window.i18n ? window.i18n.t('all') : 'Todas'}</button>
                            <button class="filter-btn" data-filter="pending">${window.i18n ? window.i18n.t('pending') : 'Pendientes'}</button>
                            <button class="filter-btn" data-filter="completed">${window.i18n ? window.i18n.t('completed') : 'Completadas'}</button>
                        </div>
                        <div class="month-tasks-list" id="monthTasksList">
                            <!-- Las tareas se cargarán aquí dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Menú contextual para eventos -->
            <div class="event-context-menu" id="eventContextMenu" style="display: none;">
                <div class="context-menu-item" id="toggleCompleteMenuItem">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>${window.i18n ? window.i18n.t('markAsCompleted') : 'Marcar como completado'}</span>
                </div>
                <div class="context-menu-item" id="editEventMenuItem">
                    <i class="fa-solid fa-pencil"></i>
                    <span>${window.i18n ? window.i18n.t('edit') : 'editar Evento'}</span>
                </div>
                <div class="context-menu-item" id="deleteEventMenuItem">
                    <i class="fas fa-trash"></i>
                    <span>${window.i18n ? window.i18n.t('delete') : 'Eliminar evento'}</span>
                </div>
            </div>
        `;
        
        // Eliminar el loading indicator y mostrar el calendario
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
        
        console.log('Calendar rendered successfully, loading indicator removed');
    }

    getMonthYear() {
        const months = window.i18n ? window.i18n.t('calendar.months') : [
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
            const eventsHTML = this.generateEventsHTML(dayEvents, dateStr);
            const scrollingClass = dayEvents.length > 3 ? 'scrolling' : '';
            daysHTML += `
                <div class="calendar-day calendar-day-other-month" data-date="${dateStr}">
                    <button class="add-event-btn" data-date="${dateStr}">+</button>
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events ${scrollingClass}">${eventsHTML}</div>
                </div>
            `;
        }

        // Days from current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = this.events.filter(event => event.date === dateStr);
            const eventsHTML = this.generateEventsHTML(dayEvents, dateStr);
            const scrollingClass = dayEvents.length > 3 ? 'scrolling' : '';
            
            daysHTML += `
                <div class="calendar-day" data-date="${dateStr}">
                    <button class="add-event-btn" data-date="${dateStr}">+</button>
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events ${scrollingClass}">${eventsHTML}</div>
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
            const eventsHTML = this.generateEventsHTML(dayEvents, dateStr);
            const scrollingClass = dayEvents.length > 3 ? 'scrolling' : '';
            daysHTML += `
                <div class="calendar-day calendar-day-other-month" data-date="${dateStr}">
                    <button class="add-event-btn" data-date="${dateStr}">+</button>
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events ${scrollingClass}">${eventsHTML}</div>
                </div>
            `;
        }

        return daysHTML;
    }

    generateEventsHTML(dayEvents, dateStr) {
        if (dayEvents.length === 0) {
            return '';
        }

        // Si hay más de 3 eventos, mostrar todos para el carrusel
        const maxVisibleEvents = dayEvents.length > 3 ? dayEvents.length : 3;
        const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
        const hiddenEvents = dayEvents.slice(maxVisibleEvents);

        let eventsHTML = visibleEvents.map(event => {
            const eventColor = event.color || 'custom-1';
            const eventIcon = event.icon || 'fas fa-calendar';
            const timeDisplay = event.time && event.time !== '00:00' ? event.time : '';
            
            // Convert color to class name
            let colorClass = 'color-color-1'; // default
            if (eventColor.startsWith('var(--event-color-')) {
                // Extract number from var(--event-color-X)
                const colorNumber = eventColor.match(/--event-color-(\d+)/);
                if (colorNumber) {
                    colorClass = `color-color-${colorNumber[1]}`;
                }
            } else if (eventColor.startsWith('var(--event-custom-')) {
                // Extract number from var(--event-custom-X)
                const customNumber = eventColor.match(/--event-custom-(\d+)/);
                if (customNumber) {
                    colorClass = `color-custom-${customNumber[1]}`;
                }
            } else if (eventColor === 'var(--event-default-color)') {
                // Handle default color
                colorClass = 'color-color-1';
            } else if (eventColor.startsWith('var(--event-') && eventColor.includes('-color)')) {
                // Handle var(--event-work-color), var(--event-study-color), etc.
                const typeMatch = eventColor.match(/--event-(\w+)-color/);
                if (typeMatch) {
                    colorClass = `color-${typeMatch[1]}`;
                }
            } else if (!eventColor.startsWith('var(')) {
                // Direct color name like 'custom-1', 'work', etc.
                colorClass = `color-${eventColor}`;
            }
            
            return `<div class="calendar-event ${colorClass} ${event.completed ? 'completed' : ''}" draggable="true" data-event-id="${event.id}" 
                 onclick="event.stopPropagation(); window.berryCalendar.editEvent('${event.id}')" 
                 oncontextmenu="event.stopPropagation(); window.berryCalendar.showEventContextMenu(event, '${event.id}'); return false;"
                 onmouseenter="window.berryCalendar.showEventTooltip(event, '${event.id}')" 
                 onmouseleave="window.berryCalendar.hideEventTooltip()">
                 <i class="calendar-event-icon ${eventIcon}"></i>
                 <span class="calendar-event-title">${event.title}</span>
                 ${timeDisplay ? `<span class="calendar-event-time">${timeDisplay}</span>` : ''}
                 ${event.completed ? '<i class="fa-solid fa-circle-check" style="color: #0dc991;"></i>' : ''}
             </div>`;
        }).join('');

        // Solo mostrar "more" si no hay carrusel activo
        if (hiddenEvents.length > 0 && dayEvents.length <= 3) {
            eventsHTML += `<div class="calendar-more-events" onclick="event.stopPropagation(); window.berryCalendar.showMoreEvents('${dateStr}')">
                +${hiddenEvents.length} more
            </div>`;
        }

        return eventsHTML;
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
        
        // Today view button
        const todayViewBtn = document.getElementById('todayViewBtn');
        if (todayViewBtn) {
            todayViewBtn.addEventListener('click', () => {
                this.showTodayDetailView();
            });
        }
        
        // Month tasks button
        const monthTasksBtn = document.getElementById('monthTasksBtn');
        if (monthTasksBtn) {
            monthTasksBtn.addEventListener('click', () => {
                this.showMonthTasksModal();
            });
        }
        
        // Month tasks modal close button
        const closeMonthTasksModal = document.getElementById('closeMonthTasksModal');
        if (closeMonthTasksModal) {
            closeMonthTasksModal.addEventListener('click', () => {
                this.hideMonthTasksModal();
            });
        }
        
        // Month tasks modal filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Update tasks view with new filter
                const currentYear = this.currentDate.getFullYear();
                const currentMonth = this.currentDate.getMonth();
                
                const monthEvents = this.events.filter(event => {
                    const eventDate = new Date(event.date + 'T00:00:00');
                    return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
                });
                
                this.renderMonthTasks(monthEvents, btn.dataset.filter);
            });
        });
        
        // Context menu event listeners
        const toggleCompleteMenuItem = document.getElementById('toggleCompleteMenuItem');
        const deleteEventMenuItem = document.getElementById('deleteEventMenuItem');
        const editEventMenuItem = document.getElementById('editEventMenuItem');

        if (toggleCompleteMenuItem) {
            toggleCompleteMenuItem.addEventListener('click', () => {
                const contextMenu = document.getElementById('eventContextMenu');
                const eventId = contextMenu.dataset.eventId;
                if (eventId) {
                    this.toggleEventCompleted(eventId);
                    this.updateMonthTasksView();
                }
                this.hideEventContextMenu();
            });
        }
        
        if (editEventMenuItem) {
            editEventMenuItem.addEventListener('click', () => {
                const contextMenu = document.getElementById('eventContextMenu');
                const eventId = contextMenu.dataset.eventId;
                if (eventId) {
                    this.editEvent(eventId);
                }
                this.hideEventContextMenu();
            });
        
        }
        
        if (deleteEventMenuItem) {
            deleteEventMenuItem.addEventListener('click', () => {
                const contextMenu = document.getElementById('eventContextMenu');
                const eventId = contextMenu.dataset.eventId;
                if (eventId) {
                    this.deleteEvent(eventId);
                    this.updateMonthTasksView();
                }
                this.hideEventContextMenu();
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
                    // Check if user is authenticated before showing event modal
                    if (window.authManager && window.authManager.currentUser) {
                        this.showEventModal(date);
                    } else if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
                        window.authManager.showLoginModal();
                    }
                } else if (e.target.classList.contains('calendar-event')) {
                    const eventId = e.target.getAttribute('data-event-id');
                    // Check if user is authenticated before editing event
                    if (window.authManager && window.authManager.currentUser) {
                        this.editEvent(eventId);
                    } else if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
                        window.authManager.showLoginModal();
                    }
                } else if (e.target.classList.contains('calendar-day') || e.target.closest('.calendar-day')) {
                    // Click on day - show detailed hourly view
                    const dayElement = e.target.classList.contains('calendar-day') ? e.target : e.target.closest('.calendar-day');
                    const date = dayElement.getAttribute('data-date');
                    if (date && !e.target.classList.contains('add-event-btn') && !e.target.classList.contains('calendar-event')) {
                        this.showDayDetailView(date);
                    }
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
        const cancelEventModalBtn = document.getElementById('cancelEventModal');
        const deleteEventModalBtn = document.getElementById('deleteEventModal');
        const submitEventModalBtn = document.getElementById('submitEventModal');
        const eventModalForm = document.getElementById('eventModalForm');
        const eventHasTimeCheckbox = document.getElementById('eventHasTime');
        const eventTimeInput = document.getElementById('modalEventTime');

        if (cancelEventModalBtn) cancelEventModalBtn.addEventListener('click', () => this.hideEventModal());
        if (deleteEventModalBtn) deleteEventModalBtn.addEventListener('click', () => this.deleteCurrentEvent());
        if (submitEventModalBtn) submitEventModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveEventFromModal();
            this.hideEventModal();
        });
        if (eventModalForm) eventModalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEventFromModal();
        });
        
        // Time checkbox handler
        if (eventHasTimeCheckbox && eventTimeInput) {
            eventHasTimeCheckbox.addEventListener('change', (e) => {
                eventTimeInput.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked) {
                    eventTimeInput.value = '';
                }
            });
        }
        
        // Color picker events
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                colorOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                // Set selected color
                document.getElementById('selectedEventColor').value = option.getAttribute('data-color');
            });
        });
        
        // Set default color selection
        if (colorOptions.length > 0) {
            colorOptions[0].classList.add('active');
        }
        
        // Icon picker events
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                iconOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                // Set selected icon
                document.getElementById('selectedEventIcon').value = option.getAttribute('data-icon');
            });
        });
        
        // Set default icon selection
        if (iconOptions.length > 0) {
            iconOptions[0].classList.add('active');
        }
        
        // Close context menu when clicking outside
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('eventContextMenu');
            if (contextMenu && !contextMenu.contains(e.target)) {
                this.hideEventContextMenu();
            }
        });
        
        // Close month tasks modal when clicking outside
        const monthTasksModal = document.getElementById('monthTasksModal');
        if (monthTasksModal) {
            monthTasksModal.addEventListener('click', (e) => {
                if (e.target === monthTasksModal) {
                    this.hideMonthTasksModal();
                }
            });
        }
    }

    showEventModal(date, eventId = null, presetTime = null) {
        const modal = document.getElementById('eventModal');
        const dateInput = document.getElementById('modalEventDate');
        const titleInput = document.getElementById('modalEventTitle');
        const timeInput = document.getElementById('modalEventTime');
        const descriptionInput = document.getElementById('modalEventDescription');
        const typeSelect = document.getElementById('modalEventType');
        const colorInput = document.getElementById('selectedEventColor');
        const iconInput = document.getElementById('selectedEventIcon');
        const hasTimeCheckbox = document.getElementById('eventHasTime');
        const deleteBtn = document.getElementById('deleteEventModal');
        const submitBtn = document.getElementById('submitEventModal');
        const modalTitle = document.querySelector('.event-modal-title');
        
        if (modal && dateInput) {
            this.currentEditingEventId = eventId;
            
            if (eventId) {
                // Editing existing event
                const event = this.events.find(e => e.id === eventId);
                if (event) {
                    titleInput.value = event.title || '';
                    dateInput.value = event.date || date;
                    timeInput.value = event.time || '';
                    descriptionInput.value = event.description || '';
                    typeSelect.value = event.type || 'other';
                    iconInput.value = event.icon || 'fas fa-calendar';
                    colorInput.value = event.color || 'var(--event-default-color)';
                    
                    // Set active icon in grid
                    const iconOptions = document.querySelectorAll('.icon-option');
                    iconOptions.forEach(opt => opt.classList.remove('active'));
                    const activeIcon = document.querySelector(`[data-icon="${event.icon || 'fas fa-calendar'}"]`);
                    if (activeIcon) activeIcon.classList.add('active');
                    
                    // Set active color in grid
                    const colorOptions = document.querySelectorAll('.color-option');
                    colorOptions.forEach(opt => opt.classList.remove('active'));
                    const activeColor = document.querySelector(`[data-color="${event.color || 'var(--event-default-color)'}"]`);
                    if (activeColor) activeColor.classList.add('active');
                    
                    // Set time checkbox
                    const hasTime = event.time && event.time !== '';
                    hasTimeCheckbox.checked = hasTime;
                    timeInput.style.display = hasTime ? 'block' : 'none';
                    
                    // Set color selection
                    document.querySelectorAll('.color-option').forEach(opt => {
                        opt.classList.remove('active');
                        if (opt.getAttribute('data-color') === event.color) {
                            opt.classList.add('active');
                        }
                    });
                    
                    deleteBtn.style.display = 'inline-block';
                    // Use i18n for Save button text with icon
                    submitBtn.innerHTML = '<i class="fas fa-save"></i> ' + (window.i18n ? window.i18n.t('calendar.saveEvent') : 'Save');
                    submitBtn.classList.add('event-modal-btn-save');
                    modalTitle.textContent = window.i18n ? window.i18n.t('calendar.editEvent') : 'Edit Event';
                }
            } else {
                // Creating new event
                titleInput.value = '';
                dateInput.value = date;
                timeInput.value = presetTime || '';
                descriptionInput.value = '';
                typeSelect.value = 'other';
                iconInput.value = 'fas fa-calendar';
                
                // Reset color and icon selections
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                const firstColorOption = document.querySelector('.color-option');
                if (firstColorOption) {
                    firstColorOption.classList.add('active');
                    colorInput.value = firstColorOption.getAttribute('data-color') || 'var(--event-color-1)';
                } else {
                    colorInput.value = 'var(--event-color-1)';
                }
                
                document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('active'));
                const firstIconOption = document.querySelector('.icon-option');
                if (firstIconOption) {
                    firstIconOption.classList.add('active');
                }
                
                hasTimeCheckbox.checked = presetTime ? true : true;
                timeInput.style.display = 'block';
                // Use i18n for Create Event button text with icon
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> ' + (window.i18n ? window.i18n.t('calendar.createEvent') : 'Create Event');
                submitBtn.classList.remove('event-modal-btn-save');
                
                deleteBtn.style.display = 'none';
                // Already set above, no need to set again
                modalTitle.textContent = window.i18n ? window.i18n.t('calendar.createEvent') : 'Create Event';
            }
            
            modal.classList.add('show');
            modal.style.display = 'flex';
            
            // Focus on the title field
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
            this.currentEditingEventId = null;
            
            // Clear the form
            const form = document.getElementById('eventModalForm');
            if (form) {
                form.reset();
            }
            
            // Reset color and icon selections to default
            const colorOptions = document.querySelectorAll('.color-option');
            colorOptions.forEach(opt => opt.classList.remove('active'));
            if (colorOptions.length > 0) {
                colorOptions[0].classList.add('active');
            }
            
            const iconOptions = document.querySelectorAll('.icon-option');
            iconOptions.forEach(opt => opt.classList.remove('active'));
            if (iconOptions.length > 0) {
                iconOptions[0].classList.add('active');
            }
            
            // Reset hidden inputs
            const colorInput = document.getElementById('selectedEventColor');
            const iconInput = document.getElementById('selectedEventIcon');
            if (colorInput) colorInput.value = colorOptions[0]?.getAttribute('data-color') || 'var(--event-color-1)';
            if (iconInput) iconInput.value = iconOptions[0]?.getAttribute('data-icon') || 'fas fa-calendar';
        }
    }

    saveEventFromModal() {
        const title = document.getElementById('modalEventTitle').value.trim();
        const date = document.getElementById('modalEventDate').value;
        const hasTime = document.getElementById('eventHasTime').checked;
        const time = hasTime ? document.getElementById('modalEventTime').value : '';
        const description = document.getElementById('modalEventDescription').value.trim();
        const type = document.getElementById('modalEventType').value;
        const icon = document.getElementById('selectedEventIcon').value;
        const color = document.getElementById('selectedEventColor').value;
        
        if (!title || !date) {
            alert('Please complete the event title and date.');
            return;
        }
        
        if (this.currentEditingEventId) {
            // Update existing event
            this.updateEvent(this.currentEditingEventId, title, date, time, description, type, icon, color);
        } else {
            // Create new event
            this.addEvent(title, date, time, description, type, icon, color);
        }
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

    async saveEventsToStorage() {
        try {
            // Only save to Firebase Realtime Database if authenticated
            if (window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseDatabase) {
                const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
                
                const userId = window.firebaseAuth.currentUser.uid;
                const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
                
                // Convert events array to object with event IDs as keys
                const eventsObject = {};
                this.events.forEach(event => {
                    eventsObject[event.id] = {
                        ...event,
                        updatedAt: new Date().toISOString()
                    };
                });
                
                await set(userEventsRef, eventsObject);
                console.log('Events synced to Firebase Realtime Database successfully');
            } else if (window.syncManager) {
                // If offline or not authenticated, add to sync queue
                this.events.forEach(event => {
                    window.syncManager.addToSyncQueue({
                        type: 'create',
                        data: event,
                        eventId: event.id
                    });
                });
            }
        } catch (error) {
            console.warn('Could not save events:', error);
            // If Firebase fails, add to sync queue for later
            if (window.syncManager) {
                this.events.forEach(event => {
                    window.syncManager.addToSyncQueue({
                        type: 'create',
                        data: event,
                        eventId: event.id
                    });
                });
            }
        }
    }

    async loadEventsFromStorage() {
        try {
            // Only load from Firebase Realtime Database if user is authenticated
            if (window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseDatabase) {
                const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
                
                const userId = window.firebaseAuth.currentUser.uid;
                const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
                
                const snapshot = await get(userEventsRef);
                if (snapshot.exists()) {
                    const eventsObject = snapshot.val();
                    this.events = [];
                    
                    // Convert object back to array and sort by updatedAt
                    Object.values(eventsObject).forEach(eventData => {
                        delete eventData.updatedAt; // Remove Firebase metadata
                        this.events.push(eventData);
                    });
                    
                    // Sort events by date for consistency
                    this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
                    console.log('Events loaded from Firebase Realtime Database successfully');
                } else {
                    // No events found for this user, initialize empty array
                    this.events = [];
                    console.log('No events found for user, starting with empty calendar');
                }
            } else {
                // User not authenticated, start with empty events
                this.events = [];
                console.log('User not authenticated, starting with empty calendar');
            }
        } catch (error) {
            console.warn('Could not load events:', error);
            // Initialize empty events on error
            this.events = [];
        }
    }

    // Method to sync events when user logs in
    async syncEventsOnLogin() {
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDatabase) {
            return;
        }

        try {
            const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const userId = window.firebaseAuth.currentUser.uid;
            const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
            
            const snapshot = await get(userEventsRef);
            if (snapshot.exists()) {
                const eventsObject = snapshot.val();
                this.events = [];
                
                // Convert object back to array
                Object.values(eventsObject).forEach(eventData => {
                    delete eventData.updatedAt; // Remove Firebase metadata
                    this.events.push(eventData);
                });
                
                // Sort events by date for consistency
                this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                this.render();
                this.attachEventListeners();
                console.log('Events synced successfully on login');
            }
            
            // Setup real-time listener for automatic updates
                this.setupRealtimeListener();
                
                // Setup periodic sync as backup
                this.setupPeriodicSync();
        } catch (error) {
            console.error('Error syncing events on login:', error);
        }
    }

    // Setup real-time listener for Firebase Realtime Database
    async setupRealtimeListener() {
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDatabase) {
            return;
        }

        try {
            const { ref, onValue, off } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const userId = window.firebaseAuth.currentUser.uid;
            const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
            
            // Remove existing listener if any
            if (this.realtimeListener) {
                off(this.realtimeListenerRef, 'value', this.realtimeListener);
            }
            
            // Setup new listener
            this.realtimeListenerRef = userEventsRef;
            this.realtimeListener = onValue(userEventsRef, (snapshot) => {
                if (snapshot.exists()) {
                    const eventsObject = snapshot.val();
                    const newEvents = [];
                    
                    // Convert object back to array
                    Object.values(eventsObject).forEach(eventData => {
                        const cleanEvent = { ...eventData };
                        delete cleanEvent.updatedAt; // Remove Firebase metadata
                        newEvents.push(cleanEvent);
                    });
                    
                    // Sort events by date for consistency
                    newEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
                    
                    // Only update if events actually changed
                    if (JSON.stringify(this.events) !== JSON.stringify(newEvents)) {
                        this.events = newEvents;
                        this.render();
                        this.attachEventListeners();
                        console.log('Events updated from real-time sync');
                    }
                } else {
                    // No events found, clear calendar
                    if (this.events.length > 0) {
                        this.events = [];
                        this.render();
                        this.attachEventListeners();
                        console.log('Events cleared from real-time sync');
                    }
                }
            }, (error) => {
                console.warn('Real-time listener error:', error);
            });
            
            console.log('Real-time listener setup successfully');
        } catch (error) {
            console.error('Error setting up real-time listener:', error);
        }
    }

    // Method to update calendar language
    updateLanguage() {
        // Update month names and weekday labels
        this.render();
        this.attachEventListeners();
        
        // Update modal texts if it's open
        this.updateModalTranslations();
    }
    
    // Method to update modal translations
    updateModalTranslations() {
        if (!window.i18n) return;
        
        // Update placeholders and labels
        const modalEventTitle = document.getElementById('modalEventTitle');
        const modalEventDescription = document.getElementById('modalEventDescription');
        const eventTypeLabel = document.querySelector('.event-type-container label');
        const dateLabel = document.querySelector('.event-date-container label');
        const timeLabel = document.querySelector('.time-checkbox-wrapper label');
        const iconLabel = document.querySelector('.icon-picker-container label');
        const colorLabel = document.querySelector('.event-color-container label');
        const deleteBtn = document.getElementById('deleteEventModal');
        const cancelBtn = document.getElementById('cancelEventModal');
        const submitBtn = document.getElementById('submitEventModal');
        const modalTitle = document.querySelector('.event-modal-title');
        
        // Update input placeholders
        if (modalEventTitle) modalEventTitle.placeholder = window.i18n.t('calendar.eventTitle');
        if (modalEventDescription) modalEventDescription.placeholder = window.i18n.t('calendar.eventDescription');
        
        // Update labels
        if (eventTypeLabel) eventTypeLabel.textContent = window.i18n.t('calendar.eventType') + ':';
        if (dateLabel) dateLabel.textContent = window.i18n.t('calendar.date') + ':';
        if (timeLabel) timeLabel.textContent = window.i18n.t('calendar.setSpecificTime');
        if (iconLabel) iconLabel.textContent = window.i18n.t('calendar.eventIcon') + ':';
        if (colorLabel) colorLabel.textContent = window.i18n.t('calendar.eventColor') + ':';
        
        // Update buttons
        if (deleteBtn) deleteBtn.title = window.i18n.t('calendar.deleteEvent');
        if (cancelBtn) cancelBtn.title = window.i18n.t('calendar.cancel');
        
        // Update event type options
        const eventTypeSelect = document.getElementById('modalEventType');
        if (eventTypeSelect) {
            const options = eventTypeSelect.options;
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const type = option.value;
                if (type === 'other' || type === 'work' || type === 'study' || type === 'leisure') {
                    option.textContent = window.i18n.t(`calendar.eventTypes.${type}`);
                }
            }
        }
        
        // Update submit button and modal title based on edit mode
        if (submitBtn && modalTitle) {
            const isEditMode = submitBtn.classList.contains('event-modal-btn-save');
            if (isEditMode) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> ' + window.i18n.t('calendar.saveEvent');
                modalTitle.textContent = window.i18n.t('calendar.editEvent');
            } else {
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> ' + window.i18n.t('calendar.createEvent');
                modalTitle.textContent = window.i18n.t('calendar.createEvent');
            }
        }
    }
    
    // Setup periodic sync as backup to real-time listener
     setupPeriodicSync() {
         if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
             return;
         }

         // Clear existing interval if any
         if (this.syncInterval) {
             clearInterval(this.syncInterval);
         }

         // Sync every 30 seconds as backup
         this.syncInterval = setInterval(async () => {
             if (window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseDatabase) {
                 try {
                     const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
                     
                     const userId = window.firebaseAuth.currentUser.uid;
                     const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
                     
                     const snapshot = await get(userEventsRef);
                     if (snapshot.exists()) {
                         const eventsObject = snapshot.val();
                         const newEvents = [];
                         
                         // Convert object back to array
                         Object.values(eventsObject).forEach(eventData => {
                             const cleanEvent = { ...eventData };
                             delete cleanEvent.updatedAt;
                             newEvents.push(cleanEvent);
                         });
                         
                         // Sort events by date
                         newEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
                         
                         // Only update if events changed
                         if (JSON.stringify(this.events) !== JSON.stringify(newEvents)) {
                             this.events = newEvents;
                             this.render();
                             this.attachEventListeners();
                             console.log('Events updated from periodic sync');
                         }
                     } else if (this.events.length > 0) {
                         // No events found, clear calendar
                         this.events = [];
                         this.render();
                         this.attachEventListeners();
                         console.log('Events cleared from periodic sync');
                     }
                 } catch (error) {
                     console.warn('Periodic sync error:', error);
                 }
             }
         }, 30000); // 30 seconds

         console.log('Periodic sync setup successfully (30s interval)');
     }

     // Method to cleanup real-time listener and periodic sync
     cleanupRealtimeListener() {
         // Cleanup real-time listener
         if (this.realtimeListener && this.realtimeListenerRef) {
             try {
                 const { off } = window.firebaseDatabase ? 
                     import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js') : 
                     { off: () => {} };
                 
                 if (off) {
                     off(this.realtimeListenerRef, 'value', this.realtimeListener);
                 }
                 
                 this.realtimeListener = null;
                 this.realtimeListenerRef = null;
                 console.log('Real-time listener cleaned up');
             } catch (error) {
                 console.warn('Error cleaning up real-time listener:', error);
             }
         }

         // Cleanup periodic sync
         if (this.syncInterval) {
             clearInterval(this.syncInterval);
             this.syncInterval = null;
             console.log('Periodic sync cleaned up');
         }
     }

    addEvent(title, date, time = '', description = '', type = 'other', icon = 'fas fa-calendar', color = 'custom-1') {
        const event = {
            id: Date.now().toString(),
            title: title,
            date: date,
            time: time,
            description: description,
            type: type,
            icon: icon,
            color: color,
            completed: false
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
    
    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            // Cerrar el modal de tareas mensuales si está abierto
            this.hideMonthTasksModal();
            this.showEventModal(event.date, eventId);
        }
    }
    
    updateEvent(eventId, title, date, time, description, type, icon, color) {
        const eventIndex = this.events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            this.events[eventIndex] = {
                ...this.events[eventIndex],
                title,
                date,
                time,
                description,
                type,
                icon,
                color
            };
            this.saveEventsToStorage();
            this.render();
            this.attachEventListeners();
            this.hideEventModal();
            
            // Mostrar el modal de tareas mensuales nuevamente si se editó desde ahí
            setTimeout(() => {
                this.showMonthTasksModal();
            }, 100);
        }
    }
    
    toggleEventCompleted(eventId) {
        const eventIndex = this.events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            this.events[eventIndex].completed = !this.events[eventIndex].completed;
            
            // Guardar en Firebase y localStorage
            this.saveEventsToStorage();
            
            // No regenerar la vista para evitar cerrar el modal
            // La actualización visual se maneja desde attachMonthTasksEventListeners
        }
    }
    
    deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        const eventTitle = event ? event.title : 'este evento';
        
        if (confirm(`¿Estás seguro de que quieres eliminar "${eventTitle}"?`)) {
            this.removeEvent(eventId);
            this.hideEventModal();
            
            // Actualizar la vista del modal de tareas mensuales si está abierto
            this.updateMonthTasksView();
        }
    }
    
    deleteCurrentEvent() {
        if (this.currentEditingEventId) {
            this.deleteEvent(this.currentEditingEventId);
        }
    }
    
    showMonthTasksModal() {
        const modal = document.getElementById('monthTasksModal');
        const tasksList = document.getElementById('monthTasksList');
        
        // Obtener eventos del mes actual
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        
        const monthEvents = this.events.filter(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
        });
        
        // Generar HTML de las tareas
        this.renderMonthTasks(monthEvents, 'all');
        
        modal.style.display = 'flex';
    }
    
    hideMonthTasksModal() {
        const modal = document.getElementById('monthTasksModal');
        modal.style.display = 'none';
        
        // Actualizar la vista del calendario cuando se cierre el modal
        // para reflejar los cambios realizados
        setTimeout(() => {
            this.render();
            this.attachEventListeners();
        }, 100);
    }
    
    renderMonthTasks(events, filter = 'all') {
        const tasksList = document.getElementById('monthTasksList');
        
        let filteredEvents = events;
        if (filter === 'pending') {
            filteredEvents = events.filter(event => !event.completed);
        } else if (filter === 'completed') {
            filteredEvents = events.filter(event => event.completed);
        }
        
        if (filteredEvents.length === 0) {
            tasksList.innerHTML = `<div class="no-tasks">${window.i18n ? window.i18n.t('noTasksToShow') : 'No hay tareas para mostrar'}</div>`;
            return;
        }
        
        const tasksHTML = filteredEvents.map(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            const formattedDate = eventDate.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
            });
            
            return `
                <div class="task-item ${event.completed ? 'completed' : ''}" data-event-id="${event.id}">
                    <div class="task-checkbox">
                        <input type="checkbox" ${event.completed ? 'checked' : ''} 
                               data-event-id="${event.id}">
                    </div>
                    <div class="task-content">
                        <div class="task-title">${event.title}</div>
                        <div class="task-details">
                            <span class="task-date">${formattedDate}</span>
                            ${event.time ? `<span class="task-time">${event.time}</span>` : ''}
                            <span class="task-type">${this.getTypeDisplayName(event.type)}</span>
                        </div>
                        ${event.description ? `<div class="task-description">${event.description}</div>` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn edit-btn" data-event-id="${event.id}" title="${window.i18n ? window.i18n.t('edit') : 'Editar'}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-action-btn delete-btn" data-event-id="${event.id}" title="${window.i18n ? window.i18n.t('delete') : 'Eliminar'}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        tasksList.innerHTML = tasksHTML;
        
        // Agregar event listeners para los botones y checkboxes
        this.attachMonthTasksEventListeners();
    }
    
    updateMonthTasksView() {
        const modal = document.getElementById('monthTasksModal');
        if (modal.style.display === 'flex') {
            // Obtener el filtro activo
            const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
            
            // Obtener eventos del mes actual
            const currentYear = this.currentDate.getFullYear();
            const currentMonth = this.currentDate.getMonth();
            
            const monthEvents = this.events.filter(event => {
                const eventDate = new Date(event.date + 'T00:00:00');
                return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
            });
            
            this.renderMonthTasks(monthEvents, activeFilter);
        }
    }
    
    attachMonthTasksEventListeners() {
        // Event listeners para checkboxes de completar tareas
        const checkboxes = document.querySelectorAll('#monthTasksList .task-checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const eventId = e.target.dataset.eventId;
                if (eventId) {
                    this.toggleEventCompleted(eventId);
                    
                    // Actualizar solo el elemento visual sin regenerar todo el HTML
                    const taskItem = e.target.closest('.task-item');
                    const event = this.events.find(ev => ev.id === eventId);
                    
                    if (event && taskItem) {
                        if (event.completed) {
                            taskItem.classList.add('completed');
                        } else {
                            taskItem.classList.remove('completed');
                        }
                    }
                    
                    // Guardar cambios sin regenerar la vista
                    this.saveEventsToStorage();
                }
            });
        });
        
        // Event listeners para botones de editar
        const editButtons = document.querySelectorAll('#monthTasksList .edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.dataset.eventId;
                if (eventId) {
                    this.editEvent(eventId);
                    this.hideMonthTasksModal();
                }
            });
        });
        
        // Event listeners para botones de eliminar
        const deleteButtons = document.querySelectorAll('#monthTasksList .delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.dataset.eventId;
                if (eventId) {
                    const event = this.events.find(ev => ev.id === eventId);
                    const eventTitle = event ? event.title : 'esta tarea';
                    
                    if (confirm(`¿Estás seguro de que quieres eliminar "${eventTitle}"?`)) {
                        this.removeEvent(eventId);
                        this.updateMonthTasksView();
                        // Actualizar la vista del calendario también
                        this.render();
                        this.attachEventListeners();
                    }
                }
            });
        });
    }
    
    showTaskStatusMessage(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            const message = event.completed ? 
                (window.i18n ? window.i18n.t('taskCompleted') : '✅ Tarea completada') : 
                (window.i18n ? window.i18n.t('taskPending') : '⏳ Tarea marcada como pendiente');
            
            // Crear elemento de notificación temporal
            const notification = document.createElement('div');
            notification.className = 'task-status-notification';
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${event.completed ? 'var(--success-color, #28a745)' : 'var(--warning-color, #ffc107)'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
                pointer-events: none;
            `;
            
            document.body.appendChild(notification);
            
            // Remover después de 3 segundos
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
    
    showEventContextMenu(event, eventId) {
        event.preventDefault();
        
        const contextMenu = document.getElementById('eventContextMenu');
        const toggleMenuItem = document.getElementById('toggleCompleteMenuItem');
        
        // Actualizar texto del menú según el estado del evento
        const eventObj = this.events.find(e => e.id === eventId);
        if (eventObj) {
            const toggleText = eventObj.completed ? 
                (window.i18n ? window.i18n.t('markAsPending') : 'Marcar como pendiente') : 
                (window.i18n ? window.i18n.t('markAsCompleted') : 'Marcar como completado');
            const toggleIcon = eventObj.completed ? 'fas fa-undo' : 'fas fa-check';
            toggleMenuItem.innerHTML = `<i class="${toggleIcon}"></i><span>${toggleText}</span>`;
        }
        
        // Posicionar el menú
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.style.display = 'block';
        
        // Guardar el ID del evento para las acciones
        contextMenu.dataset.eventId = eventId;
        
        // Cerrar menú al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', this.hideEventContextMenu.bind(this), { once: true });
        }, 10);
    }
    
    hideEventContextMenu() {
        const contextMenu = document.getElementById('eventContextMenu');
        contextMenu.style.display = 'none';
    }
    
    showMoreEvents(date) {
        const dayEvents = this.events.filter(event => event.date === date);
        const eventsContainer = document.querySelector(`[data-date="${date}"] .events-container`);
        
        if (eventsContainer) {
            const hiddenEvents = eventsContainer.querySelectorAll('.calendar-event.hidden');
            const moreEventsBtn = eventsContainer.querySelector('.more-events');
            
            hiddenEvents.forEach(event => {
                event.classList.remove('hidden');
            });
            
            if (moreEventsBtn) {
                moreEventsBtn.style.display = 'none';
            }
        }
    }

    showDayDetailView(date) {
        // Store current view state
        this.previousView = this.currentView;
        this.currentView = 'day';
        this.currentDetailDate = date;
        
        // Get events for this date
        const dayEvents = this.events.filter(event => event.date === date);
        
        // Separate all-day events from timed events
        const allDayEvents = dayEvents.filter(event => !event.time || event.time === '' || event.time === '00:00');
        const timedEvents = dayEvents.filter(event => event.time && event.time !== '' && event.time !== '00:00');
        
        // Format date for display
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Generate hours HTML (00:00 to 23:59)
        let hoursHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const hourStr = String(hour).padStart(2, '0');
            const hourDisplay = hour === 0 ? '12:00 AM' : 
                               hour < 12 ? `${hour}:00 AM` : 
                               hour === 12 ? '12:00 PM' : 
                               `${hour - 12}:00 PM`;
            
            // Find events for this hour
            const hourEvents = timedEvents.filter(event => {
                const eventHour = parseInt(event.time.split(':')[0]);
                return eventHour === hour;
            });
            
            let hourEventsHTML = '';
            hourEvents.forEach(event => {
                const eventColor = event.color || 'custom-1';
                const eventIcon = event.icon || 'fas fa-calendar';
                
                // Convert color to class name
                let colorClass = 'color-color-1';
                if (eventColor.startsWith('var(--event-color-')) {
                    const colorNumber = eventColor.match(/--event-color-(\d+)/);
                    if (colorNumber) {
                        colorClass = `color-color-${colorNumber[1]}`;
                    }
                } else if (eventColor.startsWith('var(--event-custom-')) {
                    const customNumber = eventColor.match(/--event-custom-(\d+)/);
                    if (customNumber) {
                        colorClass = `color-custom-${customNumber[1]}`;
                    }
                } else if (eventColor === 'var(--event-default-color)') {
                    // Handle default color
                    colorClass = 'color-color-1';
                } else if (eventColor.startsWith('var(--event-') && eventColor.includes('-color)')) {
                    const typeMatch = eventColor.match(/--event-(\w+)-color/);
                    if (typeMatch) {
                        colorClass = `color-${typeMatch[1]}`;
                    }
                } else if (!eventColor.startsWith('var(')) {
                    colorClass = `color-${eventColor}`;
                }
                
                hourEventsHTML += `
                    <div class="hour-event ${colorClass}" data-event-id="${event.id}" 
                         onclick="event.stopPropagation(); window.berryCalendar.editEvent('${event.id}')" 
                         onmouseenter="window.berryCalendar.showEventTooltip(event, '${event.id}')" 
                         onmouseleave="window.berryCalendar.hideEventTooltip()">
                        <i class="hour-event-icon ${eventIcon}"></i>
                        <span class="hour-event-title">${event.title}</span>
                        <span class="hour-event-time">${event.time}</span>
                    </div>
                `;
            });
            
            hoursHTML += `
                <div class="hour-slot" data-hour="${hourStr}">
                    <div class="hour-label">${hourDisplay}</div>
                    <div class="hour-content">
                        <div class="hour-events">${hourEventsHTML}</div>
                        <button class="add-hour-event-btn" data-date="${date}" data-time="${hourStr}:00" title="Agregar evento a las ${hourDisplay}">+</button>
                    </div>
                </div>
            `;
        }
        
        // Generate all-day events HTML with stacking
        let allDayHTML = '';
        if (allDayEvents.length > 0) {
            allDayEvents.forEach((event, index) => {
                const eventColor = event.color || 'custom-1';
                const eventIcon = event.icon || 'fas fa-calendar';
                
                // Convert color to class name
                let colorClass = 'color-color-1';
                if (eventColor.startsWith('var(--event-color-')) {
                    const colorNumber = eventColor.match(/--event-color-(\d+)/);
                    if (colorNumber) {
                        colorClass = `color-color-${colorNumber[1]}`;
                    }
                } else if (eventColor.startsWith('var(--event-custom-')) {
                    const customNumber = eventColor.match(/--event-custom-(\d+)/);
                    if (customNumber) {
                        colorClass = `color-custom-${customNumber[1]}`;
                    }
                } else if (eventColor === 'var(--event-default-color)') {
                    // Handle default color
                    colorClass = 'color-color-1';
                } else if (eventColor.startsWith('var(--event-') && eventColor.includes('-color)')) {
                    const typeMatch = eventColor.match(/--event-(\w+)-color/);
                    if (typeMatch) {
                        colorClass = `color-${typeMatch[1]}`;
                    }
                } else if (!eventColor.startsWith('var(')) {
                    colorClass = `color-${eventColor}`;
                }
                
                allDayHTML += `
                    <div class="all-day-event ${colorClass}" data-event-id="${event.id}" 
                         onclick="event.stopPropagation(); window.berryCalendar.editEvent('${event.id}')" 
                         onmouseenter="window.berryCalendar.showEventTooltip(event, '${event.id}')" 
                         onmouseleave="window.berryCalendar.hideEventTooltip()">
                        <i class="all-day-event-icon ${eventIcon}"></i>
                        <span class="all-day-event-title">${event.title}</span>
                        <span class="all-day-badge">Todo el día</span>
                    </div>
                `;
            });
        }
        
        // Generate the complete day detail view HTML
        const dayDetailHTML = `
            <div class="day-detail-container">
                <div class="day-detail-header">
                    <button class="back-to-calendar-btn" onclick="window.berryCalendar.backToMonthView()">
                        <i class="fas fa-arrow-left"></i> Volver al calendario
                    </button>
                    <div class="day-detail-title-section">
                        <div class="day-navigation">
                            <button class="day-nav-btn" onclick="window.berryCalendar.navigateDay('${date}', -1)">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <h2 class="day-detail-title">${formattedDate}</h2>
                            <button class="day-nav-btn" onclick="window.berryCalendar.navigateDay('${date}', 1)">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <input type="date" id="dayDateSelector" class="day-date-selector" value="${date}" onchange="window.berryCalendar.showDayDetailView(this.value)">
                    </div>
                    <button class="add-event-btn-header" onclick="window.berryCalendar.showEventModal('${date}')">
                        <i class="fas fa-plus"></i> Agregar evento
                    </button>
                </div>
                
                ${allDayEvents.length > 0 ? `
                    <div class="all-day-section">
                        <h3 class="all-day-title">Eventos de todo el día</h3>
                        <div class="all-day-events-container">
                            ${allDayHTML}
                        </div>
                    </div>
                ` : ''}
                
                <div class="hours-section">
                    <div class="hours-container-scrollable">
                        ${hoursHTML}
                    </div>
                </div>
            </div>
        `;
        
        // Replace calendar content with day detail view
        this.container.innerHTML = dayDetailHTML;
        
        // Add the event modal HTML to the container
        const modalHTML = `
 <!-- Modal for creating events -->
            <div class="event-modal" id="eventModal">
                <div class="event-modal-content">
                    <div class="event-modal-header">
                        <h3 class="event-modal-title">Create Event</h3>
                        <div class="event-modal-actions">
                            <button type="submit" class="event-modal-btn event-modal-btn-primary" id="submitEventModal"><i class="fas fa-save"></i> ${window.i18n ? window.i18n.t('calendar.save') : 'Guardar'}</button>
                            <button type="button" class="event-modal-btn event-modal-btn-danger" id="deleteEventModal" style="display: none;" title="${window.i18n ? window.i18n.t('calendar.deleteEvent') : 'Delete Event'}"><i class="fas fa-trash-alt"></i></button>
                            <button type="button" class="event-modal-btn event-modal-btn-secondary" id="cancelEventModal" title="${window.i18n ? window.i18n.t('calendar.cancel') : 'Cancel'}"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    <form class="event-modal-form" id="eventModalForm">
                        <input type="text" id="modalEventTitle" placeholder="${window.i18n ? window.i18n.t('calendar.eventTitle') : 'Event title'}" required>
                        <textarea id="modalEventDescription" placeholder="${window.i18n ? window.i18n.t('calendar.eventDescription') : 'Description (optional)'}" rows="3"></textarea>
                        
                        <div class="event-date-type-container">
                            <div class="event-type-container">
                                <label>${window.i18n ? window.i18n.t('calendar.eventType') : 'Event type'}:</label>
                                <select id="modalEventType">
                                    <option value="other">${window.i18n ? window.i18n.t('calendar.eventTypes.other') : 'Other'}</option>
                                    <option value="work">${window.i18n ? window.i18n.t('calendar.eventTypes.work') : 'Work'}</option>
                                    <option value="study">${window.i18n ? window.i18n.t('calendar.eventTypes.study') : 'Study'}</option>
                                    <option value="leisure">${window.i18n ? window.i18n.t('calendar.eventTypes.leisure') : 'Leisure'}</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="appointment">Appointment</option>
                                    <option value="birthday">Birthday</option>
                                    <option value="holiday">Holiday</option>
                                </select>
                            </div>
                            <div class="event-date-container">
                                <label>${window.i18n ? window.i18n.t('calendar.date') : 'Date'}:</label>
                                <input type="date" id="modalEventDate" required>
                            </div>
                        </div>
                        
                        <div class="event-time-container">
                            <div class="time-checkbox-wrapper">
                                <input type="checkbox" id="eventHasTime" checked>
                                <label for="eventHasTime">${window.i18n ? window.i18n.t('calendar.setSpecificTime') : 'Set specific time'}</label>
                            </div>
                            <input type="time" id="modalEventTime">
                        </div>
                        
                        <div class="icon-picker-container">
                            <label>${window.i18n ? window.i18n.t('calendar.eventIcon') : 'Icon'}:</label>
                            <div class="icon-picker-grid">
                                <div class="icon-option active" data-icon="fas fa-calendar"><i class="fas fa-calendar"></i></div>
                                <div class="icon-option" data-icon="fas fa-briefcase"><i class="fas fa-briefcase"></i></div>
                                <div class="icon-option" data-icon="fas fa-book"><i class="fas fa-book"></i></div>
                                <div class="icon-option" data-icon="fas fa-gamepad"><i class="fas fa-gamepad"></i></div>
                                <div class="icon-option" data-icon="fas fa-coffee"><i class="fas fa-coffee"></i></div>
                                <div class="icon-option" data-icon="fas fa-heart"><i class="fas fa-heart"></i></div>
                                <div class="icon-option" data-icon="fas fa-star"><i class="fas fa-star"></i></div>
                                <div class="icon-option" data-icon="fas fa-music"><i class="fas fa-music"></i></div>
                                <div class="icon-option" data-icon="fas fa-film"><i class="fas fa-film"></i></div>
                                <div class="icon-option" data-icon="fas fa-plane"><i class="fas fa-plane"></i></div>
                                <div class="icon-option" data-icon="fas fa-utensils"><i class="fas fa-utensils"></i></div>
                                <div class="icon-option" data-icon="fas fa-dumbbell"><i class="fas fa-dumbbell"></i></div>
                                <div class="icon-option" data-icon="fas fa-birthday-cake"><i class="fas fa-birthday-cake"></i></div>
                                <div class="icon-option" data-icon="fas fa-code"><i class="fas fa-code"></i></div>
                                <div class="icon-option" data-icon="fas fa-laptop-code"><i class="fas fa-laptop-code"></i></div>
                                <div class="icon-option" data-icon="fas fa-graduation-cap"><i class="fas fa-graduation-cap"></i></div>
                                <div class="icon-option" data-icon="fas fa-users"><i class="fas fa-users"></i></div>
                                <div class="icon-option" data-icon="fas fa-shopping-cart"><i class="fas fa-shopping-cart"></i></div>
                                <div class="icon-option" data-icon="fas fa-medkit"><i class="fas fa-medkit"></i></div>
                                <div class="icon-option" data-icon="fas fa-gift"><i class="fas fa-gift"></i></div>
                                <div class="icon-option" data-icon="fas fa-car"><i class="fas fa-car"></i></div>
                                <div class="icon-option" data-icon="fas fa-home"><i class="fas fa-home"></i></div>
                                <div class="icon-option" data-icon="fas fa-glass-cheers"><i class="fas fa-glass-cheers"></i></div>
                                <div class="icon-option" data-icon="fas fa-baby"><i class="fas fa-baby"></i></div>
                                <div class="icon-option" data-icon="fas fa-trophy"><i class="fas fa-trophy"></i></div>
                                <div class="icon-option" data-icon="fas fa-camera"><i class="fas fa-camera"></i></div>
                                <div class="icon-option" data-icon="fas fa-bell"><i class="fas fa-bell"></i></div>
                                <div class="icon-option" data-icon="fas fa-paint-brush"><i class="fas fa-paint-brush"></i></div>
                                <div class="icon-option" data-icon="fas fa-bug"><i class="fas fa-bug"></i></div>
                                <div class="icon-option" data-icon="fas fa-cart-plus"><i class="fas fa-cart-plus"></i></div>
                                <div class="icon-option" data-icon="fas fa-truck"><i class="fas fa-truck"></i></div>
                                <div class="icon-option" data-icon="fas fa-stethoscope"><i class="fas fa-stethoscope"></i></div>
                                <div class="icon-option" data-icon="fas fa-wifi"><i class="fas fa-wifi"></i></div>
                                <div class="icon-option" data-icon="fas fa-phone"><i class="fas fa-phone"></i></div>
                                <div class="icon-option" data-icon="fas fa-keyboard"><i class="fas fa-keyboard"></i></div>
                            </div>
                            <input type="hidden" id="selectedEventIcon" value="fas fa-calendar">
                        </div>
                        
                        <div class="event-color-container">
                            <label>${window.i18n ? window.i18n.t('calendar.eventColor') : 'Color'}:</label>
                            <div class="color-picker-grid">
                                <div class="color-option" data-color="var(--event-color-1)" style="background-color: var(--event-color-1);"></div>
                                <div class="color-option" data-color="var(--event-color-2)" style="background-color: var(--event-color-2);"></div>
                                <div class="color-option" data-color="var(--event-color-3)" style="background-color: var(--event-color-3);"></div>
                                <div class="color-option" data-color="var(--event-color-4)" style="background-color: var(--event-color-4);"></div>
                                <div class="color-option" data-color="var(--event-color-5)" style="background-color: var(--event-color-5);"></div>
                                <div class="color-option" data-color="var(--event-color-6)" style="background-color: var(--event-color-6);"></div>
                                <div class="color-option" data-color="var(--event-color-7)" style="background-color: var(--event-color-7);"></div>
                                <div class="color-option" data-color="var(--event-color-8)" style="background-color: var(--event-color-8);"></div>
                                <div class="color-option" data-color="var(--event-color-9)" style="background-color: var(--event-color-9);"></div>
                                <div class="color-option" data-color="var(--event-color-10)" style="background-color: var(--event-color-10);"></div>
                                <div class="color-option" data-color="var(--event-color-11)" style="background-color: var(--event-color-11);"></div>
                                <div class="color-option" data-color="var(--event-color-12)" style="background-color: var(--event-color-12);"></div>
                                <div class="color-option" data-color="var(--event-custom-1)" style="background-color: var(--event-custom-1);"></div>
                                <div class="color-option" data-color="var(--event-custom-2)" style="background-color: var(--event-custom-2);"></div>
                                <div class="color-option" data-color="var(--event-custom-3)" style="background-color: var(--event-custom-3);"></div>
                                <div class="color-option" data-color="var(--event-custom-4)" style="background-color: var(--event-custom-4);"></div>
                                <div class="color-option" data-color="var(--event-custom-5)" style="background-color: var(--event-custom-5);"></div>
                                <div class="color-option" data-color="var(--event-custom-6)" style="background-color: var(--event-custom-6);"></div>
                                <div class="color-option" data-color="var(--event-custom-7)" style="background-color: var(--event-custom-7);"></div>
                                <div class="color-option" data-color="var(--event-custom-8)" style="background-color: var(--event-custom-8);"></div>
                                <div class="color-option" data-color="var(--event-custom-9)" style="background-color: var(--event-custom-9);"></div>
                                <div class="color-option" data-color="var(--event-custom-10)" style="background-color: var(--event-custom-10);"></div>
                                <div class="color-option" data-color="var(--event-custom-11)" style="background-color: var(--event-custom-11);"></div>
                                <div class="color-option" data-color="var(--event-custom-12)" style="background-color: var(--event-custom-12);"></div>
                            </div>
                            <input type="hidden" id="selectedEventColor" value="var(--event-default-color)">
                        </div>
                        

                    </form>
                </div>
            </div>
        `;
        
        this.container.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners for the new buttons
        this.attachDayDetailEventListeners();
        
        // Attach modal event listeners
        this.attachModalEventListeners();
    }
    
    attachModalEventListeners() {
        // Modal events
        const modal = document.getElementById('eventModal');
        const cancelEventModalBtn = document.getElementById('cancelEventModal');
        const deleteEventModalBtn = document.getElementById('deleteEventModal');
        const submitEventModalBtn = document.getElementById('submitEventModal');
        const eventModalForm = document.getElementById('eventModalForm');
        const eventHasTimeCheckbox = document.getElementById('eventHasTime');
        const eventTimeInput = document.getElementById('modalEventTime');

        if (cancelEventModalBtn) cancelEventModalBtn.addEventListener('click', () => this.hideEventModal());
        if (deleteEventModalBtn) deleteEventModalBtn.addEventListener('click', () => this.deleteCurrentEvent());
        if (submitEventModalBtn) submitEventModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveEventFromModal();
            this.hideEventModal();
        });
        if (eventModalForm) eventModalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEventFromModal();
        });
        
        // Time checkbox handler
        if (eventHasTimeCheckbox && eventTimeInput) {
            eventHasTimeCheckbox.addEventListener('change', (e) => {
                eventTimeInput.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked) {
                    eventTimeInput.value = '';
                }
            });
        }
        
        // Color picker events
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                colorOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                // Set selected color
                document.getElementById('selectedEventColor').value = option.getAttribute('data-color');
            });
        });
        
        // Icon picker events
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                iconOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                // Set selected icon
                document.getElementById('selectedEventIcon').value = option.getAttribute('data-icon');
            });
        });
        
        // Click outside modal to close
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideEventModal();
                }
            });
        }
    }
    
    attachDayDetailEventListeners() {
        // Add event listeners for hour event buttons
        const addHourEventBtns = document.querySelectorAll('.add-hour-event-btn');
        addHourEventBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const date = btn.getAttribute('data-date');
                const time = btn.getAttribute('data-time');
                this.showEventModal(date, null, time);
            });
        });
        
        // Add click listeners to hour slots for creating events
        const hourSlots = document.querySelectorAll('.hour-slot');
        hourSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                // Only trigger if clicking on empty space, not on events or buttons
                if (e.target === slot || e.target.classList.contains('hour-label') || e.target.classList.contains('hour-content')) {
                    const hour = slot.getAttribute('data-hour');
                    const date = document.getElementById('dayDateSelector').value;
                    this.showEventModal(date, null, `${hour}:00`);
                }
            });
        });
        
        // Add drag and drop functionality to events
        const hourEvents = document.querySelectorAll('.hour-event');
        hourEvents.forEach(event => {
            event.draggable = true;
            event.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', event.getAttribute('data-event-id'));
                event.classList.add('dragging');
            });
            
            event.addEventListener('dragend', (e) => {
                event.classList.remove('dragging');
            });
        });
        
        // Add drop zones to hour slots
        hourSlots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            
            slot.addEventListener('dragleave', (e) => {
                slot.classList.remove('drag-over');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                
                const eventId = e.dataTransfer.getData('text/plain');
                const newHour = slot.getAttribute('data-hour');
                const newTime = `${newHour}:00`;
                
                // Update event time
                this.updateEventTime(eventId, newTime);
            });
        });
    }
    
    backToMonthView() {
        // Return to the monthly calendar view
        this.currentView = 'month';
        this.currentDetailDate = null;
        this.render();
        this.attachEventListeners();
    }
    
    showTodayDetailView() {
        // Show today's detail view
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
        this.currentView = 'day';
        this.currentDetailDate = todayStr;
        this.showDayDetailView(todayStr);
    }

    navigateDay(currentDate, direction) {
        // Navigate to previous or next day
        const date = new Date(currentDate + 'T00:00:00');
        date.setDate(date.getDate() + direction);
        
        const newDateStr = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');
        
        this.showDayDetailView(newDateStr);
    }
    
    updateEventTime(eventId, newTime) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.time = newTime;
            this.saveEventsToStorage();
            
            // Refresh the day view to show the updated event
            const currentDate = document.getElementById('dayDateSelector').value;
            this.showDayDetailView(currentDate);
        }
    }
    
    showEventTooltip(mouseEvent, eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        // Remove existing tooltip
        this.hideEventTooltip();
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'event-tooltip';
        tooltip.id = 'event-tooltip';
        
        const timeDisplay = event.time && event.time !== '00:00' ? event.time : 'Todo el día';
        const typeDisplay = this.getTypeDisplayName(event.type || 'other');
        
        tooltip.innerHTML = `
            <div class="event-tooltip-arrow top"></div>
            <div class="event-tooltip-title">
                <i class="${event.icon || 'fas fa-calendar'}"></i>
                ${event.title}
            </div>
            <div class="event-tooltip-meta">
                <div class="event-tooltip-time">${timeDisplay}</div>
                <div class="event-tooltip-type">${typeDisplay}</div>
            </div>
            ${event.description ? `<div class="event-tooltip-description">${event.description}</div>` : ''}
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = mouseEvent.target.closest('.calendar-event').getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Considerar el scroll de la página para posicionar correctamente
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        let left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);
        // Posicionar el tooltip por encima del evento por defecto
        let top = rect.bottom + scrollY + 10;
        
        // Ajustar si el tooltip se sale de la pantalla
        if (left < scrollX + 10) left = scrollX + 10;
        if (left + tooltipRect.width > window.innerWidth + scrollX - 10) {
            left = window.innerWidth + scrollX - tooltipRect.width - 10;
        }
        
        // Si el tooltip se sale por abajo, mostrarlo encima del evento
        if (top + tooltipRect.height > window.innerHeight + scrollY - 10) {
            top = rect.top + scrollY - tooltipRect.height - 10;
        }
        
        // Mantener siempre la flecha arriba
        tooltip.querySelector('.event-tooltip-arrow').classList.add('top');
        tooltip.querySelector('.event-tooltip-arrow').classList.remove('bottom');
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        // Show tooltip with animation
        setTimeout(() => tooltip.classList.add('show'), 10);
    }
    
    hideEventTooltip() {
        const tooltip = document.getElementById('event-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    getTypeDisplayName(type) {
        const typeNames = {
            'work': 'Trabajo',
            'study': 'Estudios',
            'leisure': 'Ocio',
            'other': 'Otro'
        };
        return typeNames[type] || 'Otro';
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
        // Mostrar loading indicator inmediatamente
        calendarWidget.innerHTML = `
            <div class="calendar-loading">
                <div class="loading-spinner"></div>
                <p>Loading calendar...</p>
            </div>
        `;
        
        // Ensure the calendar container is visible
        calendarWidget.style.display = 'block';
        calendarWidget.style.visibility = 'visible';
        calendarWidget.style.opacity = '1';
        
        // Crear nueva instancia después de un pequeño delay para que se vea el loading
        setTimeout(() => {
            window.berryCalendar = new Calendar('calendar-widget');
            console.log('Calendar initialized successfully');
            
            // Set current date in the activities form
            const today = new Date().toISOString().split('T')[0];
            const activityDateInput = document.getElementById('activity-date');
            if (activityDateInput && !activityDateInput.value) {
                activityDateInput.value = today;
            }
        }, 100);
        
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
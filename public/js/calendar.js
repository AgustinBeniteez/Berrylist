class Calendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.events = [];
        this.draggedEvent = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        const calendarHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" id="prevMonth">&lt;</button>
                    <h2 class="calendar-title">${this.getMonthYear()}</h2>
                    <button class="calendar-nav-btn" id="nextMonth">&gt;</button>
                </div>
                <div class="calendar-weekdays">
                    <div class="calendar-weekday">Dom</div>
                    <div class="calendar-weekday">Lun</div>
                    <div class="calendar-weekday">Mar</div>
                    <div class="calendar-weekday">Mié</div>
                    <div class="calendar-weekday">Jue</div>
                    <div class="calendar-weekday">Vie</div>
                    <div class="calendar-weekday">Sáb</div>
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
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let daysHTML = '';

        // Días del mes anterior
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            daysHTML += `<div class="calendar-day calendar-day-other-month">${day}</div>`;
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
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events">${eventsHTML}</div>
                </div>
            `;
        }

        // Días del mes siguiente
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            daysHTML += `<div class="calendar-day calendar-day-other-month">${day}</div>`;
        }

        return daysHTML;
    }

    attachEventListeners() {
        // Navegación de meses
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
            this.attachEventListeners();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
            this.attachEventListeners();
        });

        // Doble click para agregar evento
        document.querySelectorAll('.calendar-day:not(.calendar-day-other-month)').forEach(day => {
            day.addEventListener('dblclick', (e) => {
                this.showEventForm(e.target.closest('.calendar-day').dataset.date);
            });
        });

        // Drag and drop
        document.querySelectorAll('.calendar-event').forEach(event => {
            event.addEventListener('dragstart', (e) => {
                this.draggedEvent = {
                    id: e.target.dataset.eventId,
                    element: e.target
                };
                e.target.style.opacity = '0.5';
            });

            event.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
                this.draggedEvent = null;
            });
        });

        document.querySelectorAll('.calendar-day:not(.calendar-day-other-month)').forEach(day => {
            day.addEventListener('dragover', (e) => {
                e.preventDefault();
                day.classList.add('calendar-day-drag-over');
            });

            day.addEventListener('dragleave', (e) => {
                day.classList.remove('calendar-day-drag-over');
            });

            day.addEventListener('drop', (e) => {
                e.preventDefault();
                day.classList.remove('calendar-day-drag-over');
                
                if (this.draggedEvent) {
                    const newDate = day.dataset.date;
                    this.moveEvent(this.draggedEvent.id, newDate);
                }
            });
        });

        // Formulario de eventos
        const saveBtn = document.getElementById('saveEvent');
        const cancelBtn = document.getElementById('cancelEvent');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveEvent());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideEventForm());
        }
    }

    showEventForm(date) {
        this.selectedDate = date;
        const form = document.getElementById('eventForm');
        form.style.display = 'block';
        document.getElementById('eventTitle').focus();
    }

    hideEventForm() {
        const form = document.getElementById('eventForm');
        form.style.display = 'none';
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventTime').value = '';
    }

    saveEvent() {
        const title = document.getElementById('eventTitle').value.trim();
        const time = document.getElementById('eventTime').value;
        
        if (!title) {
            alert('Por favor ingresa un título para el evento');
            return;
        }

        const event = {
            id: Date.now().toString(),
            title: title,
            time: time || '00:00',
            date: this.selectedDate
        };

        this.events.push(event);
        this.hideEventForm();
        this.render();
        this.attachEventListeners();
    }

    moveEvent(eventId, newDate) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.date = newDate;
            this.render();
            this.attachEventListeners();
        }
    }

    // Método público para agregar eventos programáticamente
    addEvent(title, date, time = '00:00') {
        const event = {
            id: Date.now().toString(),
            title: title,
            time: time,
            date: date
        };
        this.events.push(event);
        this.render();
        this.attachEventListeners();
    }

    // Método público para obtener eventos
    getEvents() {
        return this.events;
    }
}

// Inicializar el calendario cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('calendar-widget')) {
        window.berryCalendar = new Calendar('calendar-widget');
    }
});
// User Data Manager - Manejo de datos de usuario y eventos en JSON
// Este módulo maneja la exportación, importación y estructura de datos de usuario

class UserDataManager {
    constructor() {
        this.currentUser = null;
        this.userData = {
            profile: {},
            events: [],
            settings: {},
            metadata: {}
        };
    }

    /**
     * Estructura de datos JSON para un usuario completo
     * @returns {Object} Estructura base de datos de usuario
     */
    getUserDataStructure() {
        return {
            userId: null,
            profile: {
                displayName: '',
                email: '',
                photoURL: '',
                createdAt: null,
                lastLoginAt: null
            },
            events: [
                // Estructura de evento:
                // {
                //     id: 'unique-event-id',
                //     title: 'Título del evento',
                //     description: 'Descripción del evento',
                //     date: 'YYYY-MM-DD',
                //     time: 'HH:MM',
                //     category: 'work|personal|health|other',
                //     priority: 'low|medium|high',
                //     completed: false,
                //     createdAt: 'ISO-8601-timestamp',
                //     updatedAt: 'ISO-8601-timestamp'
                // }
            ],
            settings: {
                theme: 'light', // 'light' | 'dark' | 'auto'
                language: 'es', // 'es' | 'en'
                weekStart: 'monday', // 'sunday' | 'monday'
                notifications: {
                    enabled: true,
                    reminderMinutes: 15
                },
                calendar: {
                    defaultView: 'month', // 'month' | 'week' | 'day'
                    showWeekends: true,
                    timeFormat: '24h' // '12h' | '24h'
                }
            },
            metadata: {
                version: '1.0.0',
                exportedAt: null,
                totalEvents: 0,
                lastSyncAt: null
            }
        };
    }

    /**
     * Exporta todos los datos del usuario actual a formato JSON
     * @returns {Promise<Object>} Datos del usuario en formato JSON
     */
    async exportUserData() {
        try {
            if (!window.firebaseAuth?.currentUser) {
                throw new Error('Usuario no autenticado');
            }

            const user = window.firebaseAuth.currentUser;
            const userData = this.getUserDataStructure();

            // Datos del perfil
            userData.userId = user.uid;
            userData.profile = {
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                createdAt: user.metadata.creationTime,
                lastLoginAt: user.metadata.lastSignInTime
            };

            // Cargar eventos desde Realtime Database
            userData.events = await this.loadUserEventsFromDatabase(user.uid);

            // Cargar configuraciones desde localStorage y Firestore
            userData.settings = await this.loadUserSettings(user.uid);

            // Metadata
            userData.metadata = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                totalEvents: userData.events.length,
                lastSyncAt: new Date().toISOString()
            };

            return userData;
        } catch (error) {
            console.error('Error exportando datos de usuario:', error);
            throw error;
        }
    }

    /**
     * Importa datos de usuario desde un objeto JSON
     * @param {Object} userData - Datos del usuario en formato JSON
     * @param {boolean} mergeEvents - Si true, combina eventos; si false, reemplaza
     * @returns {Promise<boolean>} True si la importación fue exitosa
     */
    async importUserData(userData, mergeEvents = false) {
        try {
            if (!window.firebaseAuth?.currentUser) {
                throw new Error('Usuario no autenticado');
            }

            const currentUser = window.firebaseAuth.currentUser;
            
            // Validar estructura de datos
            if (!this.validateUserDataStructure(userData)) {
                throw new Error('Estructura de datos inválida');
            }

            // Importar eventos
            if (userData.events && Array.isArray(userData.events)) {
                await this.importUserEvents(currentUser.uid, userData.events, mergeEvents);
            }

            // Importar configuraciones
            if (userData.settings) {
                await this.importUserSettings(currentUser.uid, userData.settings);
            }

            // Actualizar calendario si existe
            if (window.berryCalendar) {
                await window.berryCalendar.loadEventsFromStorage();
                window.berryCalendar.render();
                window.berryCalendar.attachEventListeners();
            }

            console.log('Datos de usuario importados exitosamente');
            return true;
        } catch (error) {
            console.error('Error importando datos de usuario:', error);
            throw error;
        }
    }

    /**
     * Carga eventos del usuario desde Realtime Database
     * @param {string} userId - ID del usuario
     * @returns {Promise<Array>} Array de eventos
     */
    async loadUserEventsFromDatabase(userId) {
        try {
            if (!window.firebaseDatabase) {
                return [];
            }

            const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
            const snapshot = await get(userEventsRef);
            
            const events = [];
            
            if (snapshot.exists()) {
                const eventsObject = snapshot.val();
                Object.values(eventsObject).forEach(eventData => {
                    events.push(eventData);
                });
                
                // Ordenar por fecha de creación (más recientes primero)
                events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            return events;
        } catch (error) {
            console.error('Error cargando eventos desde Realtime Database:', error);
            return [];
        }
    }

    /**
     * Importa eventos del usuario a Realtime Database
     * @param {string} userId - ID del usuario
     * @param {Array} events - Array de eventos a importar
     * @param {boolean} merge - Si true, combina con eventos existentes
     */
    async importUserEvents(userId, events, merge = false) {
        try {
            if (!window.firebaseDatabase || !Array.isArray(events)) {
                return;
            }

            const { ref, set, get, update } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const userEventsRef = ref(window.firebaseDatabase, `users/${userId}/events`);
            
            let existingEvents = {};
            
            // Si es merge, cargar eventos existentes
            if (merge) {
                const snapshot = await get(userEventsRef);
                if (snapshot.exists()) {
                    existingEvents = snapshot.val();
                }
            }

            // Preparar eventos para guardar
            const eventsToSave = { ...existingEvents };
            
            events.forEach(event => {
                const eventId = event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                eventsToSave[eventId] = {
                    ...event,
                    id: eventId,
                    importedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            });

            await set(userEventsRef, eventsToSave);
            console.log(`${events.length} eventos importados exitosamente`);
        } catch (error) {
            console.error('Error importando eventos:', error);
            throw error;
        }
    }

    /**
     * Carga configuraciones del usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} Configuraciones del usuario
     */
    async loadUserSettings(userId) {
        try {
            const defaultSettings = this.getUserDataStructure().settings;
            
            // Cargar desde localStorage
            const localSettings = {
                theme: localStorage.getItem('theme') || defaultSettings.theme,
                language: localStorage.getItem('language') || defaultSettings.language,
                weekStart: localStorage.getItem('weekStart') || defaultSettings.weekStart
            };

            // TODO: Cargar configuraciones adicionales desde Realtime Database si es necesario
            
            return {
                ...defaultSettings,
                ...localSettings
            };
        } catch (error) {
            console.error('Error cargando configuraciones:', error);
            return this.getUserDataStructure().settings;
        }
    }

    /**
     * Importa configuraciones del usuario
     * @param {string} userId - ID del usuario
     * @param {Object} settings - Configuraciones a importar
     */
    async importUserSettings(userId, settings) {
        try {
            // Guardar en localStorage
            if (settings.theme) localStorage.setItem('theme', settings.theme);
            if (settings.language) localStorage.setItem('language', settings.language);
            if (settings.weekStart) localStorage.setItem('weekStart', settings.weekStart);

            // Aplicar configuraciones inmediatamente
            if (settings.theme && window.themeManager) {
                window.themeManager.setTheme(settings.theme);
            }

            if (settings.weekStart && window.berryCalendar) {
                window.berryCalendar.setWeekStart(settings.weekStart);
            }

            console.log('Configuraciones importadas exitosamente');
        } catch (error) {
            console.error('Error importando configuraciones:', error);
        }
    }

    /**
     * Valida la estructura de datos de usuario
     * @param {Object} userData - Datos a validar
     * @returns {boolean} True si la estructura es válida
     */
    validateUserDataStructure(userData) {
        if (!userData || typeof userData !== 'object') {
            return false;
        }

        // Validar campos requeridos
        const requiredFields = ['profile', 'events', 'settings', 'metadata'];
        for (const field of requiredFields) {
            if (!(field in userData)) {
                console.warn(`Campo requerido faltante: ${field}`);
                return false;
            }
        }

        // Validar que events sea un array
        if (!Array.isArray(userData.events)) {
            console.warn('El campo events debe ser un array');
            return false;
        }

        return true;
    }

    /**
     * Descarga los datos de usuario como archivo JSON
     * @param {Object} userData - Datos a descargar
     * @param {string} filename - Nombre del archivo (opcional)
     */
    downloadUserDataAsJSON(userData, filename = null) {
        try {
            const user = window.firebaseAuth?.currentUser;
            const defaultFilename = `berrylist-backup-${user?.email || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
            
            const blob = new Blob([JSON.stringify(userData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || defaultFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Archivo JSON descargado exitosamente');
        } catch (error) {
            console.error('Error descargando archivo JSON:', error);
            throw error;
        }
    }

    /**
     * Crea un backup automático de los datos del usuario
     * @param {string} type - Tipo de backup ('manual' o 'auto')
     * @returns {Promise<boolean>} True si el backup fue exitoso
     */
    async createAutomaticBackup(type = 'auto') {
        try {
            const userData = await this.exportUserData();
            
            // Guardar en localStorage como backup
            const backupKey = `berrylist-backup-${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify({
                ...userData,
                backupDate: new Date().toISOString(),
                backupType: type
            }));
            
            // Mantener solo los últimos 5 backups
            this.cleanupOldBackups();
            
            console.log(`Backup ${type} creado exitosamente`);
            return true;
        } catch (error) {
            console.error('Error creando backup automático:', error);
            return false;
        }
    }

    /**
     * Inicia el sistema de backup automático
     */
    startAutoBackup() {
        // Crear backup automático cada 30 minutos
        this.autoBackupInterval = setInterval(() => {
            this.createAutomaticBackup('auto');
        }, 30 * 60 * 1000); // 30 minutos

        // Crear backup cuando se detecten cambios en los eventos
        this.setupEventChangeListener();
        
        console.log('Sistema de backup automático iniciado');
    }

    /**
     * Detiene el sistema de backup automático
     */
    stopAutoBackup() {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
            this.autoBackupInterval = null;
        }
        
        if (this.eventChangeListener) {
            this.eventChangeListener = null;
        }
        
        console.log('Sistema de backup automático detenido');
    }

    /**
     * Configura el listener para detectar cambios en eventos
     */
    setupEventChangeListener() {
        // Escuchar cambios en localStorage para eventos
        const originalSetItem = localStorage.setItem;
        const self = this;
        
        localStorage.setItem = function(key, value) {
            const result = originalSetItem.apply(this, arguments);
            
            // Si se modifican los eventos, crear backup automático
            if (key === 'berrylist_events') {
                // Debounce para evitar múltiples backups seguidos
                if (self.backupTimeout) {
                    clearTimeout(self.backupTimeout);
                }
                
                self.backupTimeout = setTimeout(() => {
                    self.createAutomaticBackup('auto');
                }, 5000); // 5 segundos después del último cambio
            }
            
            return result;
        };
    }

    /**
     * Obtiene la lista de backups disponibles
     * @returns {Array} Lista de backups con metadata
     */
    getAvailableBackups() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('berrylist-backup-')) {
                try {
                    const backupData = JSON.parse(localStorage.getItem(key));
                    backups.push({
                        key,
                        date: backupData.backupDate,
                        type: backupData.backupType,
                        eventsCount: backupData.events ? backupData.events.length : 0,
                        size: localStorage.getItem(key).length
                    });
                } catch (error) {
                    console.warn(`Backup inválido encontrado: ${key}`);
                }
            }
        }
        
        // Ordenar por fecha (más reciente primero)
        return backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Restaura datos desde un backup específico
     * @param {string} backupKey - Clave del backup a restaurar
     * @param {boolean} mergeEvents - Si true, combina eventos; si false, reemplaza
     * @returns {Promise<boolean>} True si la restauración fue exitosa
     */
    async restoreFromBackup(backupKey, mergeEvents = false) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error('Backup no encontrado');
            }
            
            const parsedData = JSON.parse(backupData);
            
            // Remover metadata del backup antes de importar
            const { backupDate, backupType, ...userData } = parsedData;
            
            return await this.importUserData(userData, mergeEvents);
        } catch (error) {
            console.error('Error restaurando desde backup:', error);
            return false;
        }
    }

    /**
     * Limpia backups antiguos del localStorage
     * @param {number} maxBackups - Número máximo de backups a mantener
     */
    cleanupOldBackups(maxBackups = 5) {
        try {
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('berrylist-backup-')) {
                    backupKeys.push(key);
                }
            }
            
            // Ordenar por timestamp (más reciente primero)
            backupKeys.sort((a, b) => {
                const timestampA = parseInt(a.split('-').pop());
                const timestampB = parseInt(b.split('-').pop());
                return timestampB - timestampA;
            });
            
            // Eliminar backups antiguos (mantener solo los últimos maxBackups)
            for (let i = maxBackups; i < backupKeys.length; i++) {
                localStorage.removeItem(backupKeys[i]);
                console.log(`Backup antiguo eliminado: ${backupKeys[i]}`);
            }
        } catch (error) {
            console.error('Error limpiando backups antiguos:', error);
        }
    }
}

// Crear instancia global
window.userDataManager = new UserDataManager();

// Iniciar sistema de backup automático cuando se carga la página
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Iniciar backup automático después de 5 segundos
        setTimeout(() => {
            if (window.firebaseAuth?.currentUser) {
                window.userDataManager.startAutoBackup();
            }
        }, 5000);
    });
    
    // Detener backup automático antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        window.userDataManager.stopAutoBackup();
    });
}

// Exportar para uso en módulos ES6
export default UserDataManager;
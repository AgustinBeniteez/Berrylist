/**
 * Sync Manager
 * Maneja la sincronización offline/online de datos entre localStorage y Firebase
 */

class SyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.syncInProgress = false;
        this.lastSyncTime = localStorage.getItem('berrylist_last_sync') || null;
        
        this.init();
    }

    init() {
        // Escuchar cambios en el estado de conexión
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Cargar cola de sincronización pendiente
        this.loadSyncQueue();
        
        // Si estamos online, intentar sincronizar
        if (this.isOnline) {
            this.syncWhenReady();
        }
        
        console.log('Sync Manager initialized');
    }

    /**
     * Maneja cuando la conexión vuelve a estar disponible
     */
    handleOnline() {
        console.log('Connection restored - starting sync');
        this.isOnline = true;
        this.showConnectionStatus('online');
        
        // Intentar sincronizar después de un breve delay
        setTimeout(() => {
            this.syncPendingChanges();
        }, 1000);
    }

    /**
     * Maneja cuando se pierde la conexión
     */
    handleOffline() {
        console.log('Connection lost - switching to offline mode');
        this.isOnline = false;
        this.showConnectionStatus('offline');
    }

    /**
     * Agrega una operación a la cola de sincronización
     * @param {Object} operation - Operación a sincronizar
     */
    addToSyncQueue(operation) {
        const syncItem = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            operation: operation.type, // 'create', 'update', 'delete'
            data: operation.data,
            eventId: operation.eventId || null
        };
        
        this.syncQueue.push(syncItem);
        this.saveSyncQueue();
        
        console.log('Added to sync queue:', syncItem);
        
        // Si estamos online, intentar sincronizar inmediatamente
        if (this.isOnline && !this.syncInProgress) {
            this.syncPendingChanges();
        }
    }

    /**
     * Sincroniza cambios pendientes con Firebase
     */
    async syncPendingChanges() {
        if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        this.syncInProgress = true;
        this.showSyncStatus('syncing');
        
        try {
            // Verificar autenticación
            if (!window.firebaseAuth?.currentUser) {
                console.log('User not authenticated - skipping sync');
                return;
            }

            const successfulSyncs = [];
            
            for (const item of this.syncQueue) {
                try {
                    await this.processSyncItem(item);
                    successfulSyncs.push(item.id);
                } catch (error) {
                    console.error('Error syncing item:', item, error);
                    // Continuar con el siguiente item
                }
            }
            
            // Remover items sincronizados exitosamente
            this.syncQueue = this.syncQueue.filter(item => !successfulSyncs.includes(item.id));
            this.saveSyncQueue();
            
            // Actualizar tiempo de última sincronización
            this.lastSyncTime = new Date().toISOString();
            localStorage.setItem('berrylist_last_sync', this.lastSyncTime);
            
            this.showSyncStatus('synced');
            console.log(`Sync completed. ${successfulSyncs.length} items synced.`);
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.showSyncStatus('error');
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Procesa un item individual de la cola de sincronización
     * @param {Object} item - Item a sincronizar
     */
    async processSyncItem(item) {
        const { operation, data, eventId } = item;
        
        switch (operation) {
            case 'create':
                await this.syncCreateEvent(data);
                break;
            case 'update':
                await this.syncUpdateEvent(eventId, data);
                break;
            case 'delete':
                await this.syncDeleteEvent(eventId);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Sincroniza la creación de un evento
     * @param {Object} eventData - Datos del evento
     */
    async syncCreateEvent(eventData) {
        const user = window.firebaseAuth.currentUser;
        if (!user) throw new Error('User not authenticated');
        
        const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const eventRef = ref(window.firebaseDatabase, `users/${user.uid}/events/${eventData.id}`);
        
        await set(eventRef, {
            ...eventData,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Sincroniza la actualización de un evento
     * @param {string} eventId - ID del evento
     * @param {Object} eventData - Datos actualizados del evento
     */
    async syncUpdateEvent(eventId, eventData) {
        const user = window.firebaseAuth.currentUser;
        if (!user) throw new Error('User not authenticated');
        
        const { ref, update } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const eventRef = ref(window.firebaseDatabase, `users/${user.uid}/events/${eventId}`);
        
        await update(eventRef, {
            ...eventData,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Sincroniza la eliminación de un evento
     * @param {string} eventId - ID del evento a eliminar
     */
    async syncDeleteEvent(eventId) {
        const user = window.firebaseAuth.currentUser;
        if (!user) throw new Error('User not authenticated');
        
        const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        const eventRef = ref(window.firebaseDatabase, `users/${user.uid}/events/${eventId}`);
        
        await remove(eventRef);
    }

    /**
     * Sincroniza cuando Firebase esté listo
     */
    syncWhenReady() {
        const checkFirebase = () => {
            if (window.firebaseAuth && window.firebaseDatabase) {
                // Esperar a que el usuario esté autenticado
                window.firebaseAuth.onAuthStateChanged((user) => {
                    if (user && this.syncQueue.length > 0) {
                        this.syncPendingChanges();
                    }
                });
            } else {
                setTimeout(checkFirebase, 1000);
            }
        };
        
        checkFirebase();
    }

    /**
     * Descarga y sincroniza eventos desde Firebase Realtime Database
     */
    async downloadFromFirebase() {
        if (!this.isOnline || !window.firebaseAuth?.currentUser) {
            return false;
        }

        try {
            const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const user = window.firebaseAuth.currentUser;
            const userEventsRef = ref(window.firebaseDatabase, `users/${user.uid}/events`);
            
            const snapshot = await get(userEventsRef);
            
            const firebaseEvents = [];
            if (snapshot.exists()) {
                const eventsObject = snapshot.val();
                Object.values(eventsObject).forEach(eventData => {
                    firebaseEvents.push(eventData);
                });
            }
            
            // Obtener eventos locales
            const localEvents = JSON.parse(localStorage.getItem('berrylist_events') || '[]');
            
            // Combinar eventos (Firebase tiene prioridad para conflictos)
            const mergedEvents = this.mergeEvents(localEvents, firebaseEvents);
            
            // Guardar eventos combinados localmente
            localStorage.setItem('berrylist_events', JSON.stringify(mergedEvents));
            
            console.log('Events downloaded and merged from Firebase Realtime Database');
            return true;
        } catch (error) {
            console.error('Error downloading from Firebase:', error);
            return false;
        }
    }

    /**
     * Combina eventos locales y de Firebase
     * @param {Array} localEvents - Eventos locales
     * @param {Array} firebaseEvents - Eventos de Firebase
     * @returns {Array} - Eventos combinados
     */
    mergeEvents(localEvents, firebaseEvents) {
        const merged = new Map();
        
        // Agregar eventos locales
        localEvents.forEach(event => {
            merged.set(event.id, event);
        });
        
        // Agregar/sobrescribir con eventos de Firebase (tienen prioridad)
        firebaseEvents.forEach(event => {
            const localEvent = merged.get(event.id);
            
            if (!localEvent || this.isFirebaseEventNewer(event, localEvent)) {
                merged.set(event.id, event);
            }
        });
        
        return Array.from(merged.values());
    }

    /**
     * Determina si el evento de Firebase es más reciente
     * @param {Object} firebaseEvent - Evento de Firebase
     * @param {Object} localEvent - Evento local
     * @returns {boolean} - True si el evento de Firebase es más reciente
     */
    isFirebaseEventNewer(firebaseEvent, localEvent) {
        if (!firebaseEvent.updatedAt || !localEvent.updatedAt) {
            return true; // Asumir que Firebase es más reciente si falta timestamp
        }
        
        const firebaseTime = new Date(firebaseEvent.updatedAt);
        const localTime = new Date(localEvent.updatedAt);
        
        return firebaseTime > localTime;
    }

    /**
     * Guarda la cola de sincronización en localStorage
     */
    saveSyncQueue() {
        localStorage.setItem('berrylist_sync_queue', JSON.stringify(this.syncQueue));
    }

    /**
     * Carga la cola de sincronización desde localStorage
     */
    loadSyncQueue() {
        try {
            const saved = localStorage.getItem('berrylist_sync_queue');
            this.syncQueue = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading sync queue:', error);
            this.syncQueue = [];
        }
    }

    /**
     * Muestra el estado de conexión al usuario
     * @param {string} status - 'online' o 'offline'
     */
    showConnectionStatus(status) {
        // Crear o actualizar indicador de estado
        let indicator = document.getElementById('connection-status');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-status';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 10000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        if (status === 'online') {
            indicator.innerHTML = '<i class="fas fa-wifi"></i> En línea';
            indicator.style.backgroundColor = '#28a745';
            indicator.style.color = 'white';
            
            // Ocultar después de 3 segundos
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 3000);
        } else {
            indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Sin conexión';
            indicator.style.backgroundColor = '#dc3545';
            indicator.style.color = 'white';
            indicator.style.opacity = '1';
        }
    }

    /**
     * Muestra el estado de sincronización
     * @param {string} status - 'syncing', 'synced', 'error'
     */
    showSyncStatus(status) {
        let indicator = document.getElementById('sync-status');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sync-status';
            indicator.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 11px;
                font-weight: 500;
                z-index: 10000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        switch (status) {
            case 'syncing':
                indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i> Sincronizando...';
                indicator.style.backgroundColor = '#007bff';
                indicator.style.color = 'white';
                indicator.style.opacity = '1';
                break;
            case 'synced':
                indicator.innerHTML = '<i class="fa-solid fa-circle-check"></i> Sincronizado';
                indicator.style.backgroundColor = '#28a745';
                indicator.style.color = 'white';
                indicator.style.opacity = '1';
                
                // Ocultar después de 2 segundos
                setTimeout(() => {
                    indicator.style.opacity = '0';
                }, 2000);
                break;
            case 'error':
                indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error de sync';
                indicator.style.backgroundColor = '#dc3545';
                indicator.style.color = 'white';
                indicator.style.opacity = '1';
                
                // Ocultar después de 5 segundos
                setTimeout(() => {
                    indicator.style.opacity = '0';
                }, 5000);
                break;
        }
    }

    /**
     * Obtiene estadísticas de sincronización
     * @returns {Object} - Estadísticas de sync
     */
    getSyncStats() {
        return {
            isOnline: this.isOnline,
            pendingItems: this.syncQueue.length,
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress
        };
    }

    /**
     * Fuerza una sincronización completa
     */
    async forceSyncAll() {
        if (!this.isOnline) {
            throw new Error('No hay conexión a internet');
        }
        
        // Descargar desde Firebase
        await this.downloadFromFirebase();
        
        // Sincronizar cambios pendientes
        await this.syncPendingChanges();
        
        console.log('Full sync completed');
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.syncManager = new SyncManager();
    });
} else {
    window.syncManager = new SyncManager();
}

// Exportar para uso global
window.SyncManager = SyncManager;
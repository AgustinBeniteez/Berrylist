/**
 * Data Management UI Controller
 * Maneja la interfaz de usuario para exportar, importar y hacer respaldo de datos
 */

class DataManagementUI {
    constructor() {
        this.userDataManager = null;
        this.init();
    }

    async init() {
        // Esperar a que UserDataManager esté disponible
        if (typeof UserDataManager !== 'undefined') {
            this.userDataManager = new UserDataManager();
        } else {
            // Esperar un poco más si no está disponible
            setTimeout(() => this.init(), 100);
            return;
        }

        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        // Botón de exportar datos
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExportData());
        }

        // Botón de importar datos
        const importBtn = document.getElementById('import-data-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImportClick());
        }

        // Input de archivo para importar
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Botón de crear respaldo
        const backupBtn = document.getElementById('create-backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.handleCreateBackup());
        }

        // Botones de confirmación de importación
        const confirmBtn = document.getElementById('confirm-import-btn');
        const cancelBtn = document.getElementById('cancel-import-btn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.handleConfirmImport());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.handleCancelImport());
        }
    }

    updateUI() {
        // Actualizar estado de los botones según el estado de autenticación
        const isAuthenticated = window.auth && window.auth.currentUser;
        
        // Habilitar/deshabilitar botones según el estado
        this.updateButtonStates(isAuthenticated);
    }

    updateButtonStates(isAuthenticated) {
        const exportBtn = document.getElementById('export-data-btn');
        const importBtn = document.getElementById('import-data-btn');
        const backupBtn = document.getElementById('create-backup-btn');

        // Los botones siempre están habilitados, pero mostraremos mensajes informativos
        if (exportBtn) exportBtn.disabled = false;
        if (importBtn) importBtn.disabled = false;
        if (backupBtn) backupBtn.disabled = false;
    }

    async handleExportData() {
        const exportBtn = document.getElementById('export-data-btn');
        
        try {
            this.setButtonLoading(exportBtn, true);
            this.clearMessages();
            
            const success = await this.userDataManager.exportUserData();
            
            if (success) {
                this.showMessage('Datos exportados exitosamente', 'success');
            } else {
                this.showMessage('Error al exportar los datos', 'error');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showMessage('Error inesperado al exportar los datos', 'error');
        } finally {
            this.setButtonLoading(exportBtn, false);
        }
    }

    handleImportClick() {
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar que sea un archivo JSON
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showMessage('Por favor selecciona un archivo JSON válido', 'error');
            return;
        }

        // Leer el archivo
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.selectedImportData = data;
                this.showImportOptions();
            } catch (error) {
                this.showMessage('El archivo JSON no es válido', 'error');
            }
        };
        reader.readAsText(file);
    }

    showImportOptions() {
        const importOptions = document.getElementById('import-options');
        if (importOptions) {
            importOptions.style.display = 'block';
            
            // Mostrar información sobre los datos a importar
            if (this.selectedImportData) {
                const eventsCount = this.selectedImportData.events ? this.selectedImportData.events.length : 0;
                this.showMessage(`Archivo cargado: ${eventsCount} eventos encontrados`, 'info');
            }
        }
    }

    hideImportOptions() {
        const importOptions = document.getElementById('import-options');
        if (importOptions) {
            importOptions.style.display = 'none';
        }
        this.selectedImportData = null;
        
        // Limpiar el input de archivo
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    async handleConfirmImport() {
        if (!this.selectedImportData) {
            this.showMessage('No hay datos para importar', 'error');
            return;
        }

        const confirmBtn = document.getElementById('confirm-import-btn');
        const replaceOption = document.getElementById('import-replace');
        const mergeOption = document.getElementById('import-merge');
        
        const replaceEvents = replaceOption && replaceOption.checked;
        
        try {
            this.setButtonLoading(confirmBtn, true);
            this.clearMessages();
            
            const success = await this.userDataManager.importUserData(
                this.selectedImportData, 
                { replaceEvents }
            );
            
            if (success) {
                this.showMessage('Datos importados exitosamente', 'success');
                this.hideImportOptions();
                
                // Recargar el calendario si está disponible
                if (window.initializeCalendar) {
                    setTimeout(() => {
                        window.initializeCalendar();
                    }, 1000);
                }
            } else {
                this.showMessage('Error al importar los datos', 'error');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            this.showMessage('Error inesperado al importar los datos', 'error');
        } finally {
            this.setButtonLoading(confirmBtn, false);
        }
    }

    handleCancelImport() {
        this.hideImportOptions();
        this.clearMessages();
    }

    async handleCreateBackup() {
        const backupBtn = document.getElementById('create-backup-btn');
        
        try {
            this.setButtonLoading(backupBtn, true);
            this.clearMessages();
            
            const success = await this.userDataManager.createBackup();
            
            if (success) {
                this.showMessage('Respaldo creado exitosamente', 'success');
            } else {
                this.showMessage('Error al crear el respaldo', 'error');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showMessage('Error inesperado al crear el respaldo', 'error');
        } finally {
            this.setButtonLoading(backupBtn, false);
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showMessage(message, type = 'info') {
        this.clearMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `data-message ${type}`;
        
        const icon = this.getMessageIcon(type);
        messageDiv.innerHTML = `<i class="${icon}"></i> ${message}`;
        
        // Insertar el mensaje después del último botón de datos
        const dataManagement = document.querySelector('.data-management-item');
        if (dataManagement) {
            dataManagement.appendChild(messageDiv);
            
            // Auto-ocultar mensajes de éxito después de 5 segundos
            if (type === 'success') {
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 5000);
            }
        }
    }

    getMessageIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'info': return 'fas fa-info-circle';
            default: return 'fas fa-info-circle';
        }
    }

    clearMessages() {
        const messages = document.querySelectorAll('.data-message');
        messages.forEach(msg => msg.remove());
    }

    // Método público para actualizar la UI cuando cambie el estado de autenticación
    onAuthStateChanged(user) {
        this.updateButtonStates(!!user);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dataManagementUI = new DataManagementUI();
    });
} else {
    window.dataManagementUI = new DataManagementUI();
}

// Exportar para uso global
window.DataManagementUI = DataManagementUI;
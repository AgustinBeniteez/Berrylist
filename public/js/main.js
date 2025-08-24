// Script principal para Proyecto Berry

document.addEventListener('DOMContentLoaded', () => {
    console.log('Proyecto Berry cargado correctamente');
    
    // Ejemplo de funcionalidad interactiva
    const features = document.querySelectorAll('.feature');
    
    features.forEach(feature => {
        feature.addEventListener('mouseenter', () => {
            feature.style.transform = 'translateY(-5px)';
            feature.style.transition = 'transform 0.3s ease';
        });
        
        feature.addEventListener('mouseleave', () => {
            feature.style.transform = 'translateY(0)';
        });
    });
});
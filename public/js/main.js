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

    // Animación de la línea de navegación
    const navLinks = document.querySelectorAll('.landing-nav a');
    let activeLink = null;

    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            // Si hay un enlace activo, eliminar la línea
            if (activeLink) {
                activeLink.classList.remove('active-nav-link');
            }
            // Activar el nuevo enlace
            link.classList.add('active-nav-link');
            activeLink = link;
        });
    });

    // Cuando el ratón sale de la navegación, mantener la línea en el último enlace activo
    const navContainer = document.querySelector('.landing-nav ul');
    navContainer.addEventListener('mouseleave', () => {
        // Opcional: si quieres que la línea desaparezca cuando el ratón sale de la navegación
        if (activeLink) {
            activeLink.classList.remove('active-nav-link');
            activeLink = null;
        }
    });
});
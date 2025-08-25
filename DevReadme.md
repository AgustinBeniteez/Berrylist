# Directrices de Diseño - Proyecto Berry

Este documento contiene las directrices de diseño para el Proyecto Berry, incluyendo variables de color, estados hover y otras convenciones CSS que deben seguirse durante el desarrollo.

## Paleta de Colores

### Variables de Color

```css
:root { 
  --primary-color: #2c3e50; 
  --secondary-color: #3498db; 
  --background-color: #f4f4f4; 
  --text-color: #333; 
  --hover-primary-color: #2980b9;
  --feature-background: #fff;
  --shadow-color: rgba(0, 0, 0, 0.1);
  /* Additional theme colors */ 
}
```

## Convenciones CSS

### Estados Hover

Para mantener un código más limpio y organizado, implementamos los estados hover dentro de la clase usando el selector &:hover. Ejemplo: 

```css
.button { 
  background: var(--primary-color); 
  transition: background 0.3s ease; 

  &:hover { 
    background: var(--primary-hover-color); 
  } 
}
```

### Estructura de Archivos CSS

Nuestro CSS está organizado en secciones claramente comentadas:

- Estilos generales
- Header
- Main content
- Features section
- Footer
- Responsive design

### Responsive Design

Implementamos media queries para asegurar que el sitio sea responsive:

```css
@media (max-width: 768px) {
  .features {
    grid-template-columns: 1fr;
  }
  
  nav ul {
    flex-direction: column;
  }
  
  nav ul li {
    margin: 0.5rem 0;
  }
}
```

### Convenciones de Nomenclatura

- Usar nombres descriptivos para las clases
- Utilizar kebab-case para los nombres de clases (ej. `feature-item`)
- Evitar selectores de ID para estilos (preferir clases)
- Utilizar variables CSS para valores reutilizables

### Buenas Prácticas

1. Mantener el CSS organizado por secciones con comentarios
2. Utilizar variables CSS para colores y valores recurrentes
3. Implementar transiciones suaves para interacciones
4. Seguir un enfoque mobile-first en el diseño responsive
5. Minimizar la especificidad de los selectores

## Tipografía

- Fuente principal: 'Arial', sans-serif
- Tamaño de texto base: 16px (1rem)
- Line-height: 1.6

---

Este documento debe ser consultado y actualizado regularmente durante el desarrollo del proyecto para mantener la consistencia en el diseño y la implementación.

by Agustin Benitez - 25/8/2025
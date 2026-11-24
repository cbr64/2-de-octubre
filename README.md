# 2-de-octubre
El 2 de octubre de 1968, miles de estudiantes y ciudadanos se reunieron en la Plaza de las Tres Culturas ubicada en Tlatelolco. Estudiantes, docentes y trabajadores exigían mayores libertades civiles y políticas, diálogo público y el cumplimiento de su pliego petitorio. Lamentablemente, fueron reprimidos por fuerzas del Estado. Conoce su historia.

Base estática sin framework ni compilación. Para ejecutarla:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Abre `http://localhost:5173`. La cámara requiere localhost o HTTPS, permiso del usuario y un dispositivo disponible.

- `index.html`: documento semántico con cinco secciones y navegación por anclas.
- `css/style.css`: todos los estilos, tokens en `:root` y movimientos en Y.
- `js/photo-gate.js`: acceso con foto de archivo o cámara, validación y liberación de la cámara.
- `js/scroll-effects.js`: progreso, sección activa y control de las animaciones CSS.
- `js/script.js`: composición del flujo y un único ciclo RAF con Lenis.
- `vendor/`: Lenis **1.3.17**, servido localmente con su licencia MIT.

El JavaScript propio usa sintaxis ES5 y composición por constructores/prototipos. Lenis es una dependencia externa con su propia sintaxis moderna; esta base requiere navegadores actuales para `dialog`, `getUserMedia`, `canvas.toBlob` y Web Animations. ES5 describe la sintaxis del código propio, no compatibilidad con Internet Explorer.

Para agregar movimiento, coloca un elemento con `data-motion="reveal"`, `data-motion="parallax"` o `data-motion="reverse"` dentro de un contenedor `data-scroll-track`. El contenedor permanece estático para medir la posición sin realimentar el movimiento. Ajusta recorrido y duración en los tokens `--motion-*` de `style.css`.

JavaScript busca el instante de las animaciones CSS pausadas mediante Web Animations; no escribe atributos `style` ni propiedades CSS inline. Lenis suaviza el scroll y los triggers se calculan por separado, sin GSAP. Con movimiento reducido se desactivan ambos efectos. Si Lenis no está disponible, se conserva el scroll nativo; sin JavaScript permanece legible el HTML.

La foto es obligatoria antes de entrar y puede cambiarse desde el avatar de la cabecera. Se recorta al centro, se convierte localmente a JPEG de 640 × 640 y se mantiene como una URL de objeto en memoria: no se sube, no se guarda en almacenamiento persistente y no requiere backend. Se aceptan JPEG, PNG y WebP de hasta 10 MB. La cámara se apaga al capturar, cancelar, ocultar o abandonar la página. Las operaciones pendientes se invalidan para evitar que una respuesta tardía reactive la cámara.

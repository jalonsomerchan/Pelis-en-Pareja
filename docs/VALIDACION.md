# Validación

5 de octubre de 2026.

## Ejecutado

- Build de producción Angular 22.2.1 correcta el 4 de octubre. Tras los cambios de Descubrir del 5 de octubre, `npm run build` vuelve a abortar dentro de esbuild con deadlock (código 134). `ngc -p tsconfig.app.json` sí compila TypeScript y plantillas estrictas; el bundle de producción sigue sin poder verificarse en esta máquina.
- `npm run build:pages` correcta para `pelisenpareja.alon.one`, base `/`. Verificados CNAME, recursos referenciados, iconos, manifest y los 9 hashes del service worker del artefacto.
- Workflow de Pages validado como YAML: pruebas antes de build, artefacto limitado al frontend, dependencia build → deploy, rama `main` y permisos de publicación. No se ha ejecutado en GitHub.
- Configuración de la build comprobada para localhost/127.0.0.1 (`http://localhost/OV2/api`) y el dominio de producción (`https://alon.one/api`).
- Compilación TypeScript y plantillas estrictas.
- 11 pruebas Node: gestos horizontales/verticales/diagonales y umbral, duraciones, tamaños PNG e icono maskable, ausencia de caché de API privada, prioridad manteniendo la tarjeta activa, sin duplicados y con IDs separados por tipo.
- `php -l` con PHP 7.4.33 en controlador, helper, scripts CLI, router y webhook.
- Migración aplicada a MySQL 5.7.44 temporal local, sin acceso de red; compatible y 12 tablas creadas.
- 18 comprobaciones de integración del consenso, avisos, idempotencia, cambios de miembros, películas/series, vistos, permisos y cascadas. Transacción de prueba revertida. No se han modificado datos de producción.
- 46 comprobaciones de catálogo en MySQL 5.7 temporal: prioridad fuera de la página popular, afinidad por géneros propios y de miembros actuales, vistos globales, respaldo por popularidad, selección desde el índice parcial sin consultas `discover` en vivo, exclusiones, ofertas, mezcla, pestañas, favoritos, región, paginación y sincronización. TMDB simulado, sin llamadas externas; rollback al finalizar.
- Revisión visual de escritorio (1280 × 900) y móvil (390 × 844), sin desbordamiento horizontal.
- Pruebas de navegador: swipe a la derecha, match, retiro al marcar visto y exclusión al volver a descubrir; solo series y exclusión por país.
- PWA: apertura del shell sin conexión verificada tras recargar con red desactivada; red restaurada al terminar. Actualización detectada y aplicada con el botón de la app.
- Captura de referencia en `docs/capturas/descubrir-escritorio.png`.
- Nuevas páginas comprobadas en escritorio 1280 × 900 y móvil 390 × 844: seis accesos caben sin desbordamiento; pestañas filtran series/películas y admiten flechas de teclado. Favoritos muestra sí, no y pendiente; Del grupo muestra síes de la pareja que aún no has votado, sin crear ofertas; un visto conserva historial y desaparece de plataformas. Se probó votar desde una plataforma, crear match y filtrar Series/Populares. Navegar vuelve al inicio de la página.
- Captura actual de favoritos en `docs/capturas/favoritos-escritorio.png`. Pruebas visuales en modo demo; viewport temporal restaurado y actualización PWA aplicada.

## Pendiente de infraestructura

Las migraciones de producción las ejecutará el usuario. No se ha publicado frontend/backend ni instalado el cron en esta sesión. El nuevo `POST /pelisenpareja/sync_catalog` requiere ejecutar `20261005_pelisenpareja_catalog_sync.sql`; el endpoint Similar requiere `20261005_pelisenpareja_similar.sql`. Para Pages siguen pendientes el repositorio/remoto, la configuración de Pages, el DNS, HTTPS y la autorización del dominio en Firebase. El usuario ha rellenado el atributo TMDB local; la cartelera real y su configuración en producción no se han comprobado. No se han emitido correos ni mensajes Telegram reales.

Por ello, el acceso Firebase completo contra la nueva API, la cartelera real, la recepción de emails y los avisos Telegram deberán comprobarse tras configurar y desplegar. El modo demo permite revisar el producto mientras tanto y se identifica siempre como simulación.

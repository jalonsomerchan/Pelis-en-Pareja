# Validación

4 de octubre de 2026.

## Ejecutado

- Build de producción Angular 22.2.1 correcta. Bundle inicial aproximadamente 428 kB (110 kB transferidos estimados).
- Compilación TypeScript y plantillas estrictas.
- 7 pruebas Node: gestos horizontales/verticales/diagonales y umbral, duraciones, tamaños PNG e icono maskable, ausencia de caché de API privada.
- `php -l` con PHP 7.4.33 en controlador, helper, scripts CLI, router y webhook.
- Migración aplicada a MySQL 5.7.44 temporal local, sin acceso de red; compatible y 12 tablas creadas.
- 18 comprobaciones de integración del consenso, avisos, idempotencia, cambios de miembros, películas/series, vistos, permisos y cascadas. Transacción de prueba revertida. No se han modificado datos de producción.
- Revisión visual de escritorio (1280 × 900) y móvil (390 × 844), sin desbordamiento horizontal.
- Pruebas de navegador: swipe a la derecha, match, retiro al marcar visto y exclusión al volver a descubrir; solo series y exclusión por país.
- PWA: apertura del shell sin conexión verificada tras recargar con red desactivada; red restaurada al terminar. Actualización detectada y aplicada con el botón de la app.
- Captura de referencia en `docs/capturas/descubrir-escritorio.png`.

## Pendiente de infraestructura

La migración de producción la ejecutará el usuario. No se ha publicado frontend/backend ni instalado el cron. El atributo TMDB está vacío a propósito. No se han emitido correos ni mensajes Telegram reales.

Por ello, el acceso Firebase completo contra la nueva API, la cartelera real, la recepción de emails y los avisos Telegram deberán comprobarse tras configurar y desplegar. El modo demo permite revisar el producto mientras tanto y se identifica siempre como simulación.

# Pelis en pareja

Leer `docs/CONTEXTO.md` antes de continuar y actualizarlo al terminar cambios importantes. No almacenar contraseñas, tokens Firebase ni credenciales SSH en archivos de contexto.

Frontend Angular 22 standalone, signals y detección de cambios sin Zone.js. Español, mobile first, PWA con service worker Angular. Configuración pública en `public/runtime-config.js`; no usar variables de entorno para TMDB.

Hosting frontend: GitHub Pages en `https://pelisenpareja.alon.one`, base `/`. Workflow en `.github/workflows/deploy-pages.yml`, rama `main`, comando `npm run build:pages`. Ver `docs/GITHUB_PAGES.md`. Mantener API local `http://localhost/OV2/api` y producción `https://alon.one/api`.

Backend canónico en `/Applications/MAMP/htdocs/OV2/api/pelisenpareja.php`, compatible con PHP 7.4. Clave TMDB en atributo privado de `PelisTmdb`. Auth existente `auth.php`; Telegram existente `telegram.php`, helper `PelisTelegram.php`. MySQL `pelisenpareja`.

Las migraciones de producción quedan para que el usuario las ejecute, según su última instrucción del 4 de octubre de 2026. Mantener idénticas las copias de la migración en `database/migrations` y la carpeta `api/migrations`.

Preservar los cambios ajenos existentes en la API compartida. No cargar todos los controladores en el router; usar la lista explícita. Los helpers del controlador son privados: todos los métodos públicos son accesibles por HTTP.

Toda escritura de voto o membresía se serializa con el bloqueo de la fila del grupo. Los vistos son globales al grupo; los votos son individuales. Película y serie nunca comparten la misma clave lógica. Recalcular matches al cambiar membresía. Los avisos Telegram salen de una cola persistente fuera de la transacción.

Catálogo en `api/PelisCatalog.php`: priorizar síes de miembros actuales pendientes del usuario y respetar filtros/disponibilidad. La tarjeta activa se conserva al recibir prioridades durante el sondeo. Favoritos muestra votos individuales de miembros actuales, según petición del usuario. Las pestañas de portada son un filtro personal. Plataformas usa fecha de estreno y popularidad TMDB, no métricas reales de reproducciones ni fechas de incorporación al catálogo.

Verificar cambios relevantes con `npm test`, `npm run build` y `php -l` con PHP 7.4. El test MySQL es exclusivamente local por socket temporal, con rollback; no reutilizar credenciales de producción para pruebas. No enviar mensajes reales ni correos durante pruebas.

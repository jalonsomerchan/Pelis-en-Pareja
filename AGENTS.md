# Pelis en pareja

Leer `docs/CONTEXTO.md` antes de continuar y actualizarlo al terminar cambios importantes. No almacenar contraseñas, tokens Firebase ni credenciales SSH en archivos de contexto.

Frontend Angular 22 standalone, signals y detección de cambios sin Zone.js. Español, mobile first, PWA con service worker Angular. Configuración pública en `public/runtime-config.js`; no usar variables de entorno para TMDB.

Backend canónico en `/Applications/MAMP/htdocs/OV2/api/pelisenpareja.php`, compatible con PHP 7.4. Clave TMDB en atributo privado de `PelisTmdb`. Auth existente `auth.php`; Telegram existente `telegram.php`, helper `PelisTelegram.php`. MySQL `pelisenpareja`.

Las migraciones de producción quedan para que el usuario las ejecute, según su última instrucción del 4 de octubre de 2026. Mantener idénticas las copias de la migración en `database/migrations` y la carpeta `api/migrations`.

Preservar los cambios ajenos existentes en la API compartida. No cargar todos los controladores en el router; usar la lista explícita. Los helpers del controlador son privados: todos los métodos públicos son accesibles por HTTP.

Toda escritura de voto o membresía se serializa con el bloqueo de la fila del grupo. Los vistos son globales al grupo; los votos son individuales. Película y serie nunca comparten la misma clave lógica. Recalcular matches al cambiar membresía. Los avisos Telegram salen de una cola persistente fuera de la transacción.

Verificar cambios relevantes con `npm test`, `npm run build` y `php -l` con PHP 7.4. El test MySQL es exclusivamente local por socket temporal, con rollback; no reutilizar credenciales de producción para pruebas. No enviar mensajes reales ni correos durante pruebas.

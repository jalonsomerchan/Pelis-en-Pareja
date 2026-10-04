# Contexto de Pelis en pareja

Actualizado: 4 de octubre de 2026.

## Pedido

PWA Angular para elegir películas y series en pareja/grupo, backend PHP 7.4 en la API existente y MySQL `pelisenpareja`. Reutilizar auth y Telegram. Invitaciones por código/correo. Preferencias compartidas de plataformas, tipo, categorías y países excluidos. Deslizar sí/no/visto; visto excluye para todo el grupo; unanimidad genera match y notificaciones. TMDB con clave como atributo de clase, sin variables de entorno. Guardar contexto en Markdown.

## Última instrucción sobre producción

El usuario pidió inicialmente crear las tablas directamente. MySQL externo terminó en timeout y la autenticación SSH fue rechazada. Después indicó: **«Déjame las migrations y yo las lanzo»**. Por tanto, la migración queda pendiente de ejecución por el usuario. No guardar las credenciales facilitadas. No se han creado tablas ni desplegado archivos en producción.

## Realizado

- Angular 22.2.1, Firebase SDK, señales, formularios standalone, PWA instalable con manifest, iconos y service worker.
- Acceso Google, registro/login con correo, verificación y recuperación de contraseña. Tokens Firebase actualizados por el SDK y validados por `auth.php`.
- Grupos múltiples, crear/unirse, invitar por correo y código, compartir, renovar código, retirar miembros y salir con transferencia de propietario.
- Descubrir con arrastre táctil/puntero, botones y flechas del teclado; ficha de detalle; matches; avisos; configuración de plataformas y exclusiones por categoría/país.
- Modo demo explícito, sin escrituras ni comunicaciones externas; ilustraciones/posters y disponibilidad de ejemplo.
- Backend en la carpeta API: `pelisenpareja.php`, `PelisTelegram.php`, migración SQL y dos scripts CLI.
- Router: nueva entrada explícita `pelisenpareja`. Webhook existente: tokens `pp_` vinculados a la nueva app. `/stop` desconecta también Pelis en pareja.
- 12 tablas InnoDB. Se aplicaron y probaron solo en MySQL temporal local; no producción.
- Consenso serializado por grupo, idempotencia de match/avisos, recalcular tras entradas y salidas, vistos comunes a todos.
- Cola Telegram con claims, recuperación de workers, reintentos y descarte de avisos de un consenso ya inválido.
- Sin caché privada de API; cartelera visual cacheada por el service worker. Offline informa y bloquea votos reales.

## Decisiones

- Backend confirmado por el usuario: `http://localhost/OV2/api` cuando el frontend se abre en `localhost` o `127.0.0.1`; `https://alon.one/api` en producción. Selección automática por hostname en `public/runtime-config.js`, verificada también en el build.
- Región inicial ES, modificable; proveedores dinámicos de TMDB, sin IDs fijos de plataformas en producción.
- Aceptar cualquier plataforma elegida (OR) con modalidad de suscripción `flatrate`.
- Países por origen/producción de la ficha; excluye coproducciones si cualquier país está vetado.
- Dos miembros como mínimo para un match. Con más de dos, deben votar sí todos.
- Códigos aleatorios de 12 caracteres. Invitaciones por email con token hasheado, caducidad 7 días y aceptación explícita con email verificado.
- Código permite unirse sin verificación adicional de correo. El código puede revocarse/renovarse.
- Filtros afectan nuevas propuestas; no borran votos ni matches históricos por sí solos.
- Cambiar la composición del grupo invalida matches hasta que vuelva a haber unanimidad. Se conserva ID e historial de generaciones.
- Los vistos permanecen excluidos incluso si abandona el grupo quien los marcó.
- La identidad compartida de la API no se duplica: `pp_users` contiene un perfil y ajustes específicos, sin contraseñas.
- Avisos internos consultados cada 15 segundos con app visible. Telegram se entrega mediante cron cada minuto. No se ha implementado Web Push con backend VAPID.

## Para ponerla en producción

1. Usuario: ejecutar migración y verificar 12 tablas.
2. Añadir clave a `PelisTmdb::$apiKey` y definir `pelisenpareja::$appUrl` con el dominio real.
3. Subir archivos PHP y cambios del router/webhook.
4. Habilitar métodos Firebase y dominios autorizados.
5. Comprobar transporte de correo y bot/webhook Telegram ya existente.
6. Instalar cron de Telegram.
7. Publicar `dist/pelis-en-pareja/browser` bajo HTTPS. Si cambia base path, usar `ng build --base-href /ruta/`.
8. Prueba real con dos cuentas verificadas y una plataforma: un sí de cada miembro, match, aviso y visto global.

Ver `DESPLIEGUE.md` y `VALIDACION.md`. La vista local sirve para revisar el producto; no acredita despliegue en producción.

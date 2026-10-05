# Contexto de Pelis en pareja

Actualizado: 4 de octubre de 2026.

## Pedido

PWA Angular para elegir películas y series en pareja/grupo, backend PHP 7.4 en la API existente y MySQL `pelisenpareja`. Reutilizar auth y Telegram. Invitaciones por código/correo. Preferencias compartidas de plataformas, tipo, categorías y países excluidos. Deslizar sí/no/visto; visto excluye para todo el grupo; unanimidad genera match y notificaciones. TMDB con clave como atributo de clase, sin variables de entorno. Guardar contexto en Markdown.

## Última instrucción sobre producción

El usuario pidió inicialmente crear las tablas directamente. MySQL externo terminó en timeout y la autenticación SSH fue rechazada. Después indicó: **«Déjame las migrations y yo las lanzo»**. Por tanto, la migración queda pendiente de ejecución por el usuario. No guardar las credenciales facilitadas. No se han creado tablas ni desplegado archivos en producción.

## Realizado

- Angular 22.2.1, Firebase SDK, señales, formularios standalone, PWA instalable con manifest, iconos y service worker. Navegación lateral en escritorio y menú hamburguesa en móvil.
- Acceso Google, registro/login con correo, verificación y recuperación de contraseña. Tokens Firebase actualizados por el SDK y validados por `auth.php`.
- Grupos múltiples, crear/unirse, invitar por correo y código, compartir, renovar código, retirar miembros y salir con transferencia de propietario.
- Descubrir con arrastre táctil/puntero, botones y flechas del teclado; ficha de detalle; matches; avisos; configuración de plataformas y exclusiones por categoría/país.
- Modo demo explícito, sin escrituras ni comunicaciones externas; ilustraciones/posters y disponibilidad de ejemplo.
- Backend en la carpeta API: `pelisenpareja.php`, `PelisTelegram.php`, migración SQL y dos scripts CLI.
- Router: nueva entrada explícita `pelisenpareja`. Webhook existente: tokens `pp_` vinculados a la nueva app. `/stop` desconecta también Pelis en pareja.
- 12 tablas InnoDB. Se aplicaron y probaron solo en MySQL temporal local; no producción.
- Consenso serializado por grupo, idempotencia de match/avisos, recalcular tras entradas y salidas, vistos comunes a todos.
- El propietario puede reiniciar las votaciones del grupo: borra votos y vistos, incrementa `filter_version`, desactiva matches activos y omite sus avisos Telegram pendientes; la acción pide confirmación.
- Cola Telegram con claims, recuperación de workers, reintentos y descarte de avisos de un consenso ya inválido.
- Sin caché privada de API; cartelera visual cacheada por el service worker. Offline informa y bloquea votos reales.
- Frontend preparado para GitHub Pages en `pelisenpareja.alon.one`: workflow de pruebas/build/despliegue en `main`, comando `build:pages`, CNAME y guía `GITHUB_PAGES.md`. La carpeta no tiene Git ni remoto; Pages/DNS/Firebase y publicación siguen pendientes.
- Nuevas peticiones: los síes de miembros actuales tienen prioridad (dos propuestas preferidas por cada propuesta general), incluso si no están en la página popular de TMDB. El sondeo promueve propuestas nuevas conservando la tarjeta activa; nunca reintroduce votos propios ni vistos.
- Favoritos paginados con selector Mis favoritos/Del grupo: tus síes o los de cualquier miembro y votos de miembros actuales, incluidos negativos y pendientes. Los vistos conservan historial y un aviso de visto global.
- Pestañas Series | Películas | Todo | Realities en portada: filtro personal, sin escrituras en preferencias compartidas. Realities usa la categoría de series Reality de TMDB (género 10764); también está disponible en Plataformas. La elección del grupo se usa como valor inicial.
- Página Plataformas: selector entre suscripciones elegidas, Recientes/Populares, series/películas/todo, paginación, ficha y votar sí directamente. Filtros del grupo y vistos se respetan.
- Helper backend nuevo `PelisCatalog.php`; endpoints `priorities`, `favorites`, `platforms`. Se reutilizan las tablas existentes, sin migración adicional. Pruebas: 10 Node, 26 catálogo y 18 consenso MySQL local; TMDB simulado.

## Decisiones

- Backend confirmado por el usuario: `http://localhost/OV2/api` cuando el frontend se abre en `localhost` o `127.0.0.1`; `https://alon.one/api` en producción. Selección automática por hostname en `public/runtime-config.js`, verificada también en el build.
- Hosting elegido: GitHub Pages en `https://pelisenpareja.alon.one`, base `/`. Con Actions, configurar el dominio en Settings → Pages; el archivo CNAME por sí solo no lo activa. DNS CNAME del subdominio hacia el usuario/organización `.github.io`, sin nombre de repositorio.
- Región inicial ES, modificable; proveedores dinámicos de TMDB, sin IDs fijos de plataformas en producción.
- Aceptar cualquier plataforma elegida (OR) con modalidad de suscripción `flatrate`.
- Países por origen/producción de la ficha; excluye coproducciones si cualquier país está vetado.
- Dos miembros como mínimo para un match. Con más de dos, deben votar sí todos.
- Códigos aleatorios de 12 caracteres. Invitaciones por email con token hasheado, caducidad 7 días y aceptación explícita con email verificado.
- Código permite unirse sin verificación adicional de correo. El código puede revocarse/renovarse.
- Filtros afectan nuevas propuestas; no borran votos ni matches históricos por sí solos.
- Cambiar la composición del grupo invalida matches hasta que vuelva a haber unanimidad. Se conserva ID e historial de generaciones.
- Los vistos permanecen excluidos incluso si abandona el grupo quien los marcó.
- Por petición del usuario, los votos individuales sí son visibles en la página de favoritos de otros miembros del mismo grupo. No se exponen emails ni datos de otros grupos.
- Recientes usa fecha de estreno original del título; Populares usa popularidad TMDB. TMDB no aporta aquí fechas de incorporación por plataforma ni cifras reales de reproducciones.
- La identidad compartida de la API no se duplica: `pp_users` contiene un perfil y ajustes específicos, sin contraseñas.
- Avisos internos consultados cada 15 segundos con app visible. Telegram se entrega mediante cron cada minuto. No se ha implementado Web Push con backend VAPID.

## Para ponerla en producción

1. Usuario: ejecutar migración y verificar 12 tablas.
2. Confirmar la configuración privada de `PelisTmdb::$apiKey` en el servidor (el usuario ya rellenó el atributo local). `pelisenpareja::$appUrl` usa `https://pelisenpareja.alon.one`.
3. Subir archivos PHP y cambios del router/webhook.
4. Habilitar métodos Firebase y dominios autorizados.
5. Comprobar transporte de correo y bot/webhook Telegram ya existente.
6. Instalar cron de Telegram.
7. Subir el frontend a un repositorio con `main` y configurar GitHub Pages, dominio, DNS y HTTPS según `GITHUB_PAGES.md`. El workflow publica `dist/pelis-en-pareja/browser` con base `/`.
8. Prueba real con dos cuentas verificadas y una plataforma: un sí de cada miembro, match, aviso y visto global.

Ver `DESPLIEGUE.md` y `VALIDACION.md`. La vista local sirve para revisar el producto; no acredita despliegue en producción.

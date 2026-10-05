# Contexto de Pelis en pareja

Actualizado: 5 de octubre de 2026.

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
- Backend en la carpeta API: `pelisenpareja.php`, `PelisTelegram.php`, migraciones SQL y tres scripts CLI (migraciones, avisos y sincronización del catálogo).
- Router: nueva entrada explícita `pelisenpareja`. Webhook existente: tokens `pp_` vinculados a la nueva app. `/stop` desconecta también Pelis en pareja.
- 12 tablas base InnoDB aplicadas solo en MySQL temporal local; no producción. `pp_similar` y las dos tablas del índice de catálogo quedan pendientes de sus migraciones, que el usuario ejecutará manualmente.
- Consenso serializado por grupo, idempotencia de match/avisos, recalcular tras entradas y salidas, vistos comunes a todos.
- El propietario puede reiniciar las votaciones del grupo: borra votos y vistos, incrementa `filter_version`, desactiva matches activos y omite sus avisos Telegram pendientes; la acción pide confirmación.
- Cola Telegram con claims, recuperación de workers, reintentos y descarte de avisos de un consenso ya inválido.
- Sin caché privada de API; cartelera visual cacheada por el service worker. Offline informa y bloquea votos reales.
- Frontend preparado para GitHub Pages en `pelisenpareja.alon.one`: workflow de pruebas/build/despliegue en `main`, comando `build:pages`, CNAME y guía `GITHUB_PAGES.md`. La carpeta no tiene Git ni remoto; Pages/DNS/Firebase y publicación siguen pendientes.
- Nuevas peticiones: los síes de miembros actuales tienen prioridad (dos propuestas preferidas por cada propuesta general), incluso si no están en la página popular de TMDB. El sondeo promueve propuestas nuevas conservando la tarjeta activa; nunca reintroduce votos propios ni vistos.
- Descubrir siempre selecciona candidatos de `pp_catalog_items`, aunque la sincronización inicial siga en curso; no usa la ruta `discover` en vivo de TMDB. Puntúa coincidencias de género con sí propio (4), visto propio (1), sí de miembro actual (2) y visto de otro miembro actual (0.5), dividido por el número de géneros del candidato. Los síes ajenos siguen teniendo prioridad exacta; los vistos globales se excluyen. Si no hay coincidencias, ordena por popularidad local. El sondeo detecta cambios de actividad del grupo y reordena conservando la tarjeta activa.
- En la pestaña Todo se mantienen dos propuestas prioritarias por cada propuesta general, pero se intercala esta última entre dos prioridades consecutivas del mismo tipo cuando hay películas y series disponibles. Así una preferencia concentrada en series o películas no oculta el otro tipo al principio del mazo.
- La carga inicial de Descubrir recorre páginas del índice local si aún no reúne seis propuestas; en Todo también sigue buscando si falta uno de los dos tipos. Las páginas generales de Descubrir ya no se guardan en `pp_cache`: las puntuaciones y exclusiones se recalculan desde MySQL al leer cada página, mientras el navegador conserva el mazo pendiente. Novedades mantiene su caché filtrada de seis horas.
- Descubrir conserva en el navegador el mazo pendiente, la siguiente página y la pestaña personal por usuario y grupo. Al volver a la vista o abrir de nuevo la app retoma ese cursor; si no encuentra propuestas en las páginas recorridas, continúa desde la siguiente página y muestra ese número en vez de indicar que el catálogo terminó. El checkpoint se invalida al cambiar la versión de filtros o el día del catálogo TMDB y no se guarda en modo demo.
- En Descubrir, votar quita la tarjeta activa y muestra de inmediato la siguiente que ya está en memoria; el guardado y los avisos/matches siguen en segundo plano. Se puede valorar la tarjeta siguiente mientras hay votos pendientes, sin duplicar el mismo título. Se precargan los carteles de las tres siguientes propuestas y se pide otra página cuando quedan menos de tres. Si el guardado falla, se restaura la tarjeta; los vistos confirmados por otra persona siguen excluidos.
- El modal de detalle enlaza cada plataforma disponible con las opciones de visionado del título y añade un enlace independiente a su ficha TMDB. Si TMDB no tiene sinopsis en español, se usa primero una traducción inglesa y después cualquier traducción disponible; las fichas antiguas sin sinopsis también se completan al servirlas. La disponibilidad de plataformas procede de JustWatch vía TMDB.
- Descubrir ocupa el alto restante de la pantalla en móvil: la tarjeta crece junto a sus botones hasta el borde inferior. En escritorio, la ficha y las acciones se distribuyen en dos columnas; se retiró el panel lateral decorativo y se conserva la atribución de TMDB/JustWatch.
- Al votar desde Descubrir, «Me apetece» anima la tarjeta hacia la derecha y «Hoy no» hacia la izquierda antes de mostrar la siguiente. «Ya la vi» usa una salida suave; las preferencias de movimiento reducido reciben un fundido breve. La petición de voto empieza durante la animación.
- Favoritos paginados con selector Mis favoritos/Del grupo: tus síes o los de cualquier miembro y votos de miembros actuales, incluidos negativos y pendientes. Los vistos conservan historial y un aviso de visto global.
- Pestañas Series | Películas | Todo | Realities en portada: filtro personal, sin escrituras en preferencias compartidas. Realities usa la categoría de series Reality de TMDB (género 10764); también está disponible en Plataformas. La elección del grupo se usa como valor inicial.
- Página Plataformas: selector entre suscripciones elegidas, Recientes/Populares, series/películas/todo, paginación y ficha. Cada tarjeta permite votar Sí o No y cambiar el voto propio; los títulos ya vistos por el grupo se omiten. Filtros del grupo se respetan. En móviles, las tarjetas van en una sola columna, con cartel a la izquierda y ficha/acciones a la derecha.
- Página Novedades: reúne películas y series recientes de todas las plataformas del grupo, filtra por tipo y permite votar. Ordena por estreno TMDB, guarda las páginas filtradas seis horas en `pp_cache` y precarga la siguiente en segundo plano. No afirma la fecha real de incorporación, que TMDB no proporciona.
- Página Filter: asistente personal de seis pasos para tipo (película, serie o reality), una plataforma del grupo, países principales, categorías, periodo de estreno y orden. Consulta `discover` con filtros puntuales sin cambiar las preferencias compartidas; los títulos se muestran de uno en uno y se pueden votar con los controles de Descubrir. No requiere migración adicional.
- Página Estadísticas por grupo: recuentos de títulos con sí, no, visto y match activo; desgloses por categorías, países y plataformas disponibles en la región. Solo cuentan votos de miembros actuales y un título se cuenta una vez por estado; los desgloses pueden solaparse. Incluye datos simulados en modo demo y actualización mientras está abierta.
- Helper backend `PelisCatalog.php`; endpoints `priorities`, `favorites`, `platforms`, `news`, `statistics` y filtros personales opcionales en `discover`. Se reutilizan las tablas existentes, sin migración adicional. Pruebas: Node y catálogo/consenso MySQL locales con TMDB simulado.
- Sincronización incremental del catálogo por país, proveedor y tipo de contenido: `POST /pelisenpareja/sync_catalog` permite actualización puntual autenticada y `cron/pelisenpareja_catalog_sync.php` procesa las selecciones activas sin sesión Firebase desde cron. El worker CLI agrupa las plataformas seleccionadas por región y avanza hasta cinco páginas por región en cada ejecución. Descubrir usa desde el inicio las filas que ya están en el índice; Plataformas y Novedades pasan a usarlo tras completarse el primer recorrido. Las fichas completas se consultan bajo demanda y quedan almacenadas/caché en la base. El índice y el cursor requieren `20261005_pelisenpareja_catalog_sync.sql`, duplicada en `database/migrations` y `api/migrations`, pendiente de aplicar manualmente en producción. TMDB pagina hasta 500 páginas por combinación; ambos métodos informan las combinaciones truncadas. El cron no se ha instalado en producción; sus instrucciones están en `api/cron/README.md` y `docs/DESPLIEGUE.md`.
- Endpoint autenticado `similar`: consulta `/movie/{id}/similar` o `/tv/{id}/similar` de TMDB y persiste las relaciones en `pp_similar`, conservando página y posición. La migración `20261005_pelisenpareja_similar.sql` está duplicada en `database/migrations` y `api/migrations`; queda para ejecución manual del usuario.
- Página Similares en la navegación: listado adaptable con las mismas pestañas de tipo de contenido que Descubrir. Recomienda títulos similares a los síes propios y a los títulos que esa persona marcó como vistos en el grupo activo; respeta plataformas, exclusiones, vistos globales y votos propios. Permite votar Sí, No o Visto, muestra fichas y pagina resultados. El endpoint autenticado `similar_feed` obtiene y persiste las relaciones con Similar de TMDB en `pp_similar`; no añade migraciones a las ya pendientes.

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
- Novedades ordena títulos disponibles por fecha de estreno de TMDB; la disponibilidad proviene de JustWatch a través de TMDB. Las fechas exactas de alta requieren una fuente que ofrezca historial de disponibilidad.
- La identidad compartida de la API no se duplica: `pp_users` contiene un perfil y ajustes específicos, sin contraseñas.
- Avisos internos consultados cada 15 segundos con app visible. Telegram se entrega mediante cron cada minuto. No se ha implementado Web Push con backend VAPID.

## Para ponerla en producción

1. Usuario: ejecutar las migraciones en orden y verificar 15 tablas.
2. Confirmar la configuración privada de `PelisTmdb::$apiKey` en el servidor (el usuario ya rellenó el atributo local). `pelisenpareja::$appUrl` usa `https://pelisenpareja.alon.one`.
3. Subir archivos PHP y cambios del router/webhook.
4. Habilitar métodos Firebase y dominios autorizados.
5. Comprobar transporte de correo y bot/webhook Telegram ya existente.
6. Instalar cron de Telegram y catálogo según `docs/DESPLIEGUE.md`.
7. Subir el frontend a un repositorio con `main` y configurar GitHub Pages, dominio, DNS y HTTPS según `GITHUB_PAGES.md`. El workflow publica `dist/pelis-en-pareja/browser` con base `/`.
8. Prueba real con dos cuentas verificadas y una plataforma: un sí de cada miembro, match, aviso y visto global.

Ver `DESPLIEGUE.md` y `VALIDACION.md`. La vista local sirve para revisar el producto; no acredita despliegue en producción.

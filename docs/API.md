# API de Pelis en pareja

Base: `{API_BASE}/pelisenpareja`. Router Flight existente. GET y POST según tabla; un método incorrecto devuelve 405. Todos los endpoints requieren un ID token Firebase en `Authorization: Bearer ...`.

Éxito: `{"ok":true,"data":...}`. Error: `{"ok":false,"status":401,"code":"AUTH_REQUIRED","message":"..."}`. No se exponen errores SQL, credenciales ni trazas.

## Contratos

| Método | Endpoint | Parámetros | Resultado |
| --- | --- | --- | --- |
| GET | bootstrap | — | user, groups, invitations, telegram, tmdb_configured |
| POST | create_group | name | group |
| POST | join_group | code | group |
| POST | invite_email | group_id, email | group, email_sent, invite_url, message |
| POST | accept_invite | invitation_id o token | group |
| POST | cancel_invite | group_id, invitation_id | group |
| POST | rotate_code | group_id | group |
| POST | remove_member | group_id, uid | left |
| GET | catalog | group_id, region opcional | providers, movie_genres, tv_genres, countries |
| POST | settings | group_id, name, region, media_type, providers, excluded_genres, excluded_countries | group |
| GET | discover | group_id, page (1–500), media_type opcional; búsqueda Filter opcional: filter=1, provider_id, countries, genres, date_from, date_to, sort_by | titles, next_page, filter_version, reason |
| GET | similar | group_id, media_type (movie/tv), tmdb_id, page opcional (1–500) | resultados de TMDB y relaciones guardadas |
| GET | similar_feed | group_id, media_type (movie/tv/both/reality), page (1–20) | titles, next_page, filter_version, reason |
| GET | priorities | group_id, media_type opcional | titles prioritarios, filter_version |
| GET | favorites | group_id, page (1–500), scope (mine/group) | items (30 por página), next_page |
| GET | platforms | group_id, provider_id, mode (recent/popular), media_type opcional, page | titles, next_page, filter_version, reason |
| GET | state | group_id, media_type opcional, titles (lista movie:ID,tv:ID, máximo 60) | group, hidden, seen, priority_keys |
| POST | vote | group_id, media_type, tmdb_id, decision | saved, matches nuevos |
| GET | matches | group_id | matches activos |
| GET | notifications | — | últimos 100 avisos propios |
| POST | read_notifications | ids (máximo 200) | read |
| POST | telegram_link | objeto vacío | url, expires_in |
| POST | telegram_unlink | objeto vacío | telegram |
| POST | telegram_preferences | enabled | telegram |

`settings.media_type`: `movie`, `tv` o `both`. `vote.media_type`: `movie` o `tv`. `decision`: `like`, `dislike` o `seen`. `providers` y `excluded_genres` son arrays de IDs numéricos de TMDB. `excluded_countries` y `region` usan ISO 3166-1 de dos letras.

`reason` del mazo puede ser `providers_required`, `exhausted` o null. Un lote vacío con `next_page` no significa fin: se puede seguir buscando. Un título contiene `id`, `media_type`, `title`, `overview`, carteles, fecha, puntuación, duración/temporadas, géneros, países y proveedores.

Los matches devueltos al votar son únicamente los que acaba de crear esa operación. La lista completa se obtiene en `matches`.

`discover`/`priorities`/`platforms` aceptan `media_type=movie|tv|both`; si se omite, usan el tipo del grupo. El filtro de la petición no cambia el grupo. Prioridad: síes de miembros actuales, sin voto propio ni visto global, ordenados por cantidad de síes y recencia. Se revalida disponibilidad y exclusiones antes de registrar la oferta. La mezcla favorece dos títulos con síes por cada título general, sin duplicados. `group_likes` señala el número de síes en las propuestas prioritarias.

`discover?filter=1` ejecuta una búsqueda personal de `movie`, `tv` o `reality`, sin prioridades ni cambios a los ajustes del grupo. Requiere `provider_id` de una plataforma elegida en el grupo. `countries` admite códigos separados por `|` de US, ES, GB, FR, KR y DE; `genres` admite IDs separados por `|`. Cada lista usa coincidencia con cualquiera de sus valores, y se siguen aplicando las exclusiones compartidas. `date_from` y `date_to` usan `YYYY-MM-DD`; se filtra la fecha original de estreno o emisión y `date_to` por defecto es hoy. `sort_by` admite `popularity.desc`, `revenue.desc` (solo películas), `vote_average.desc` o `vote_count.desc`. Los resultados omiten títulos ya vistos o votados por esa persona y registran una oferta para que se puedan votar desde Filter. No requiere migración.

`similar` consulta el endpoint TMDB `/movie/{id}/similar` o `/tv/{id}/similar` y persiste cada relación en `pp_similar`, con su página y posición. Al refrescar la primera página se reemplazan las relaciones previas de ese título; al consultar páginas siguientes se actualiza solo esa página. Requiere ejecutar `20261005_pelisenpareja_similar.sql`.

`similar_feed` crea el listado de la página Similares a partir de los síes propios y de títulos que tú marcaste como vistos (`pp_seen.marked_by`), solo del grupo activo. Consulta el endpoint Similar de TMDB por cada título de referencia y persiste las relaciones en `pp_similar`. Descarta raíces, duplicados, títulos con voto propio o vistos por cualquier miembro, y vuelve a aplicar disponibilidad y filtros del grupo antes de registrar una oferta que permita votar. `media_type=reality` limita los resultados al género Reality. `reason` puede ser `no_sources`, `providers_required`, `exhausted` o null.

`favorites.items`: `{title, liked_at, seen, matched, votes:[{uid,display_name,decision}]}`. `scope=mine` (por defecto) incluye tus votos `like`; `scope=group` los títulos que gustan a algún miembro actual, sin duplicados, dentro del grupo autorizado. `decision` es `like`, `dislike`, `seen` o null (pendiente). La persona que marcó visto se identifica como `seen`; `seen=true` informa de la exclusión global. El historial no se pierde al marcar visto. Los votos pertenecen solo a miembros actuales. `title.my_decision` refleja tu voto y `can_vote=false` señala fichas consultadas sin voto propio previo: la lista compartida no crea ofertas ni permite saltarse filtros. Para votar esos títulos se utiliza Descubrir o Plataformas.

`platforms.provider_id` debe estar entre las plataformas elegidas del grupo. `recent` ordena por estreno original, sin fechas futuras; `popular` por popularidad TMDB. No representan fechas de incorporación a una plataforma ni sus cifras de reproducciones. Se aplican exclusiones del grupo y se eliminan vistos. Los títulos incluyen `my_decision` y registran oferta para poder votar desde esta página; aquí pueden verse títulos que ya votaste.

`state.hidden` retira vistos y votos propios del mazo; `state.seen` retira solo vistos de los catálogos. `priority_keys` son pistas de síes pendientes para consultar `priorities` cuando cambien; no autorizan un voto por sí solas. Un voto previamente guardado permite reconsiderarlo desde el historial aunque hayan cambiado filtros; los vistos siguen bloqueando nuevos síes/noes. Sin voto previo se exige una oferta vigente, salvo marcar un match como visto.

## Permisos

`invite_email`, `cancel_invite`, `rotate_code` y `settings`: propietario. `remove_member`: propietario para expulsar o el propio miembro para salir. `accept_invite`: mismo email verificado de la invitación, vigente y pendiente. El UID del autor se obtiene del auth; el UID del cuerpo de `remove_member` solo identifica a quien se quiere retirar.

Un usuario ajeno no recibe datos del grupo. La lista de invitaciones con emails solo se incluye al propietario. Favoritos permite ver los votos individuales de los miembros actuales del propio grupo, según la petición del usuario. No expone sus emails ni votos de otros grupos.

## Errores relevantes

- 401 `AUTH_REQUIRED`: falta acceso válido.
- 403 `GROUP_FORBIDDEN`, `OWNER_REQUIRED`, `EMAIL_NOT_VERIFIED`.
- 404 `CODE_NOT_FOUND`, `INVITE_NOT_FOUND`.
- 409 `DECK_STALE`, `ALREADY_SEEN`.
- 429 `RATE_LIMIT`: reenvío de la misma invitación antes de 60 segundos.
- 503 `TMDB_NOT_CONFIGURED`, `TMDB_UNAVAILABLE`.

Los scripts `cron/pelisenpareja_migrate.php`, `cron/pelisenpareja_notifications.php` y el test de integración son **solo CLI** y responden 404 si se intentan invocar por HTTP.

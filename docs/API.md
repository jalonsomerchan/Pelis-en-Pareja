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
| GET | discover | group_id, page (1–500) | titles, next_page, filter_version, reason |
| GET | state | group_id, titles (lista movie:ID,tv:ID, máximo 60) | group, hidden |
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

## Permisos

`invite_email`, `cancel_invite`, `rotate_code` y `settings`: propietario. `remove_member`: propietario para expulsar o el propio miembro para salir. `accept_invite`: mismo email verificado de la invitación, vigente y pendiente. El UID del autor se obtiene del auth; el UID del cuerpo de `remove_member` solo identifica a quien se quiere retirar.

Un usuario ajeno no recibe datos del grupo. La lista de invitaciones con emails solo se incluye al propietario. No se exponen emails de miembros ni votos individuales de otras personas.

## Errores relevantes

- 401 `AUTH_REQUIRED`: falta acceso válido.
- 403 `GROUP_FORBIDDEN`, `OWNER_REQUIRED`, `EMAIL_NOT_VERIFIED`.
- 404 `CODE_NOT_FOUND`, `INVITE_NOT_FOUND`.
- 409 `DECK_STALE`, `ALREADY_SEEN`.
- 429 `RATE_LIMIT`: reenvío de la misma invitación antes de 60 segundos.
- 503 `TMDB_NOT_CONFIGURED`, `TMDB_UNAVAILABLE`.

Los scripts `cron/pelisenpareja_migrate.php`, `cron/pelisenpareja_notifications.php` y el test de integración son **solo CLI** y responden 404 si se intentan invocar por HTTP.

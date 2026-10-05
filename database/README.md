# Migración de Pelis en pareja

La migración **no está aplicada en producción**. El 4 de octubre de 2026 el usuario pidió dejar los archivos para ejecutarla personalmente tras fallar el acceso SSH.

Migraciones, en orden:

- `migrations/20261004_pelisenpareja.sql`: crea la base y las 12 tablas iniciales.
- `migrations/20261005_pelisenpareja_catalog_sync.sql`: crea `pp_catalog_items` y `pp_catalog_sync` para el índice y su cursor. Copia idéntica en `/Applications/MAMP/htdocs/OV2/api/migrations/`.
- `migrations/20261005_pelisenpareja_similar.sql`: crea `pp_similar` para persistir las relaciones TMDB. Copia idéntica en `/Applications/MAMP/htdocs/OV2/api/migrations/`.

Son idempotentes, usan InnoDB y utf8mb4 y no eliminan datos ni modifican las tablas de otras aplicaciones. La migración base se probó con MySQL 5.7.44. En producción quedan pendientes hasta que las ejecute el usuario.

## Ejecutar en el servidor

Con un usuario MySQL con permiso para crear la base y las tablas:

```bash
mysql -u jorge -p < migrations/20261004_pelisenpareja.sql
mysql -u jorge -p pelisenpareja < migrations/20261005_pelisenpareja_catalog_sync.sql
mysql -u jorge -p pelisenpareja < migrations/20261005_pelisenpareja_similar.sql
```

Introduce la contraseña cuando MySQL la pida. No se guardan credenciales en este proyecto.

También existe `api/cron/pelisenpareja_migrate.php`, solo CLI, que aplica en orden todos los SQL de `api/migrations/` mediante la conexión de `BaseControler.php`. Ejecutarlo desde el servidor que tenga acceso a esa conexión:

```bash
php /RUTA/API/cron/pelisenpareja_migrate.php
```

El script enumera las tablas tras completar las migraciones. Al aparecer 15 tablas, el esquema actual está preparado. La cuenta usada por la aplicación necesita SELECT, INSERT, UPDATE y DELETE en `pelisenpareja`; las migraciones requieren además CREATE.

## Tablas

| Tabla | Contenido |
| --- | --- |
| pp_users | Perfil de la identidad Firebase y preferencias Telegram |
| pp_groups | Grupos, propietario, código y filtros compartidos |
| pp_members | Miembros de cada grupo |
| pp_invites | Invitaciones por correo, hash del token, caducidad y envío |
| pp_titles | Fichas TMDB y disponibilidad por región |
| pp_votes | Votos por persona, grupo y título |
| pp_seen | Títulos excluidos para todo el grupo por estar vistos |
| pp_matches | Consensos actuales e historial de generaciones |
| pp_notifications | Avisos internos y cola persistente Telegram |
| pp_telegram_tokens | Tokens de vinculación de un uso y 10 minutos |
| pp_cache | Caché TMDB compartida del servidor |
| pp_offers | Propuestas ofrecidas al usuario y versión de filtros |
| pp_similar | Relaciones TMDB entre títulos, con página y posición |
| pp_catalog_items | Índice regional por proveedor y tipo de contenido |
| pp_catalog_sync | Cursor y estado de cada recorrido incremental |

No se crea una tabla de contraseñas: la autenticación sigue siendo la de `auth.php` y Firebase.

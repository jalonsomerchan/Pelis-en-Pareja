# Migración de Pelis en pareja

La migración **no está aplicada en producción**. El 4 de octubre de 2026 el usuario pidió dejar los archivos para ejecutarla personalmente tras fallar el acceso SSH.

Archivo: `migrations/20261004_pelisenpareja.sql`. Copia idéntica en `/Applications/MAMP/htdocs/OV2/api/migrations/20261004_pelisenpareja.sql`.

Crea la base `pelisenpareja` si no existe y 12 tablas `pp_*`. Es idempotente, usa InnoDB y utf8mb4 y no elimina datos ni modifica las tablas de otras aplicaciones. Probada con MySQL 5.7.44.

## Ejecutar en el servidor

Con un usuario MySQL con permiso para crear la base y las tablas:

```bash
mysql -u jorge -p < migrations/20261004_pelisenpareja.sql
mysql -u jorge -p pelisenpareja < verify.sql
```

Introduce la contraseña cuando MySQL la pida. No se guardan credenciales en este proyecto.

También existe `api/cron/pelisenpareja_migrate.php`, solo CLI, que reutiliza la conexión de `BaseControler.php`. Ejecutarlo desde el servidor que tenga acceso a esa conexión:

```bash
php /RUTA/API/cron/pelisenpareja_migrate.php
```

El script enumera las tablas tras completar la migración. Si aparecen 12 tablas, el esquema base está preparado. La cuenta usada por la aplicación necesita SELECT, INSERT, UPDATE y DELETE en `pelisenpareja`; la migración requiere además CREATE.

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

No se crea una tabla de contraseñas: la autenticación sigue siendo la de `auth.php` y Firebase.

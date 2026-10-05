# Despliegue

## Backend PHP 7.4

Archivos nuevos en `/Applications/MAMP/htdocs/OV2/api`:

```text
pelisenpareja.php
PelisCatalog.php
PelisTelegram.php
migrations/20261004_pelisenpareja.sql
migrations/20261005_pelisenpareja_similar.sql
cron/pelisenpareja_migrate.php
cron/pelisenpareja_notifications.php
```

Cambios mínimos en archivos existentes:

- `index.php`: entrada `pelisenpareja => pelisenpareja.php` en la lista de controladores.
- `telegram.php`: los `/start pp_...` pasan a `PelisTelegram::link`. `/stop` desconecta también esta app.

Conservar `BaseControler.php`, `auth.php`, Composer y la configuración local de Telegram existentes. No reemplazar archivos compartidos con versiones antiguas. La API ya admite CORS para localhost y subdominios de `alon.one`; si se publica fuera de esos dominios, añadir el origen exacto a `applyCorsHeaders`.

Extensiones requeridas: mysqli/mysqlnd, cURL, OpenSSL y mbstring. PHP 7.4 no admite las sintaxis de PHP 8; los archivos nuevos se han comprobado con el binario MAMP 7.4.33.

Ejecutar la migración según `database/README.md`. Después insertar la clave en `PelisTmdb::$apiKey`. No enviar esa clave al frontend. `pelisenpareja::$appUrl` ya está configurado como `https://pelisenpareja.alon.one`, el dominio elegido para GitHub Pages. Aún no se ha configurado ni publicado el dominio en esta sesión.

## Correo

`invite_email` llama a `mail()` con un remitente configurable en `$mailFrom`. El servidor necesita MTA o relay ya configurado; si usas un remitente diferente, ajustar SPF/DKIM en su dominio según el servicio de correo. Si `mail()` no acepta el mensaje, el endpoint devuelve `email_sent=false` y mantiene la invitación disponible mediante enlace o al entrar con ese correo.

No se ha enviado ningún correo real durante las pruebas. `mail()` aceptado no garantiza llegada al buzón: comprobar una invitación real tras desplegar.

## Telegram

Bot y webhook compartidos de `telegram.php`. No registrar un segundo webhook para el mismo bot. Publicar el cambio al webhook y `PelisTelegram.php` antes de conectar cuentas.

Añadir un cron cada minuto en el servidor, ajustando las rutas reales:

```cron
* * * * * /usr/bin/php /RUTA/API/cron/pelisenpareja_notifications.php >> /RUTA/LOGS/pelisenpareja-telegram.log 2>&1
```

Ejecutar manualmente una vez permite revisar el resultado JSON `sent`, `failed`, `checked`. Solo se envía a personas que hayan conectado su Telegram desde la app y tengan avisos activos. El worker no está instalado en producción en esta sesión.

## Frontend

El destino es **GitHub Pages en `https://pelisenpareja.alon.one`**. Ver [GITHUB_PAGES.md](GITHUB_PAGES.md) para el workflow preparado y los pasos de Pages, DNS, HTTPS y Firebase.

`public/runtime-config.js` contiene solo configuración pública. Para producción usa `https://alon.one/api`; en localhost/127.0.0.1, `http://localhost/OV2/api`. MAMP local debe estar arrancado.

Firebase: proyecto existente `alonsoftware`, Google y Email/Password activos, dominios del frontend autorizados. La app incluye verificación y recuperación de contraseña; estos flujos dependen de la configuración de Authentication existente.

```bash
npm ci
npm run build:pages
```

El workflow publica `dist/pelis-en-pareja/browser` mediante las acciones oficiales de Pages. Usa base `/` para el dominio personalizado, conserva manifest y service worker y no necesita reescrituras para las vistas actuales ni las invitaciones `/?invitation=...`. El archivo `CNAME` identifica el dominio en la build, pero con Actions hay que configurarlo expresamente en Settings → Pages.

Si se publica alternativamente en Apache, subir el contenido de esa carpeta incluidos archivos ocultos (`.htaccess`). Servir bajo HTTPS y no cachear persistentemente `index.html`, `runtime-config.js`, `ngsw.json` ni `ngsw-worker.js`; la `.htaccess` ya lo indica con `mod_headers`. GitHub Pages no aplica `.htaccess` ni permite configurar esas cabeceras desde el proyecto.

Para publicar alternativamente en una subcarpeta:

```bash
npx ng build --base-href /pelisenpareja/
```

La base href, start_url e iconos quedan relativos. Para una subcarpeta, también definir `$appUrl` con esa ruta para las invitaciones.

## Comprobación real

Para actualizar a las nuevas páginas, subir `pelisenpareja.php` y `PelisCatalog.php` juntos y publicar la nueva build. Para habilitar `GET similar`, subir también la migración `20261005_pelisenpareja_similar.sql` y ejecutarla antes de usar ese endpoint.

1. Crear dos cuentas y un grupo, elegir una plataforma y tipo de contenido.
2. Unirse con código y aceptar una invitación desde el correo correcto verificado.
3. Cada miembro da sí al mismo título: un solo match y un aviso interno por miembro.
4. Conectar Telegram desde ambas cuentas; ejecutar el worker y revisar los avisos.
5. Marcar un título como visto: desaparece de propuestas/matches para ambos.
6. Excluir género y país, incluidas coproducciones, y revisar propuestas.
7. Instalar la PWA; abrir sin conexión, comprobar banner y votos bloqueados.
8. Cambiar miembros del grupo y comprobar que el consenso se recalcula.
9. Dar sí a un título con una cuenta y comprobar que aparece antes para los demás, respetando los filtros y sin repetir sus votos.
10. Abrir Favoritos y comprobar síes, noes y pendientes con dos cuentas; revisar que cambios se reflejan durante el sondeo.
11. Probar Series/Películas/Todo sin modificar preferencias del grupo y explorar Recientes/Populares en cada suscripción.

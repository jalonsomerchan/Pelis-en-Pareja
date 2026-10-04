# Despliegue

## Backend PHP 7.4

Archivos nuevos en `/Applications/MAMP/htdocs/OV2/api`:

```text
pelisenpareja.php
PelisTelegram.php
migrations/20261004_pelisenpareja.sql
cron/pelisenpareja_migrate.php
cron/pelisenpareja_notifications.php
```

Cambios mínimos en archivos existentes:

- `index.php`: entrada `pelisenpareja => pelisenpareja.php` en la lista de controladores.
- `telegram.php`: los `/start pp_...` pasan a `PelisTelegram::link`. `/stop` desconecta también esta app.

Conservar `BaseControler.php`, `auth.php`, Composer y la configuración local de Telegram existentes. No reemplazar archivos compartidos con versiones antiguas. La API ya admite CORS para localhost y subdominios de `alon.one`; si se publica fuera de esos dominios, añadir el origen exacto a `applyCorsHeaders`.

Extensiones requeridas: mysqli/mysqlnd, cURL, OpenSSL y mbstring. PHP 7.4 no admite las sintaxis de PHP 8; los archivos nuevos se han comprobado con el binario MAMP 7.4.33.

Ejecutar la migración según `database/README.md`. Después insertar la clave en `PelisTmdb::$apiKey`. No enviar esa clave al frontend. Definir `pelisenpareja::$appUrl` con la URL pública real. Se propone `https://pelisenpareja.alon.one`, pero no se ha creado ni publicado ese dominio.

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

`public/runtime-config.js` contiene solo configuración pública. Para producción usa `https://alon.one/api`. Si cambia el servidor, editarlo. MAMP local debe estar arrancado; si usa puerto 8888, cambiar la URL local.

Firebase: proyecto existente `alonsoftware`, Google y Email/Password activos, dominios del frontend autorizados. La app incluye verificación y recuperación de contraseña; estos flujos dependen de la configuración de Authentication existente.

```bash
npm ci
npm run build
```

Publicar el contenido de `dist/pelis-en-pareja/browser`, incluidos archivos ocultos (`.htaccess`). Debe servir `index.html` para rutas de navegación, MIME `application/manifest+json` para el manifest y HTTPS para instalar service workers. No cachear persistentemente `index.html`, `runtime-config.js`, `ngsw.json` ni `ngsw-worker.js`; la `.htaccess` de la build ya lo indica en Apache con `mod_headers`.

Para publicar en una subcarpeta:

```bash
npx ng build --base-href /pelisenpareja/
```

La base href, start_url e iconos quedan relativos. Para una subcarpeta, también definir `$appUrl` con esa ruta para las invitaciones.

## Comprobación real

1. Crear dos cuentas y un grupo, elegir una plataforma y tipo de contenido.
2. Unirse con código y aceptar una invitación desde el correo correcto verificado.
3. Cada miembro da sí al mismo título: un solo match y un aviso interno por miembro.
4. Conectar Telegram desde ambas cuentas; ejecutar el worker y revisar los avisos.
5. Marcar un título como visto: desaparece de propuestas/matches para ambos.
6. Excluir género y país, incluidas coproducciones, y revisar propuestas.
7. Instalar la PWA; abrir sin conexión, comprobar banner y votos bloqueados.
8. Cambiar miembros del grupo y comprobar que el consenso se recalcula.

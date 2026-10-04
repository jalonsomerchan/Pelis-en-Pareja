# Pelis en pareja

PWA en Angular 22, con backend PHP 7.4 en la API compartida de AlonSoftware y MySQL `pelisenpareja`.

Crea un grupo, invita por código o correo, elige plataformas, películas/series y filtros. Cada persona desliza a su ritmo. Cuando todos quieren ver el mismo título, hay un match y avisos para los miembros. Si alguien marca un título como visto, deja de aparecer para todo el grupo.

## Abrir la aplicación

```bash
npm install
npm start
```

Abre `http://127.0.0.1:4200`. El enlace **Echa un vistazo a la demo** permite revisar las tarjetas, los matches y los ajustes sin cuentas ni TMDB. Todos los datos de la demo son una simulación en memoria.

```bash
npm run build
npm run preview
```

La build instalable está en `dist/pelis-en-pareja/browser`. `preview` sirve esa build con su service worker en el puerto 4200. Node 24.15 o superior compatible con Angular 22; el equipo usa Node 24.18. No hace falta Angular CLI global.

## Configuración y puesta en marcha

1. Ejecuta la [migración](database/README.md). **Pendiente de ejecución por el usuario en producción.**
2. Añade tu clave TMDB al atributo privado `$apiKey` de `PelisTmdb`, en `/Applications/MAMP/htdocs/OV2/api/pelisenpareja.php`. Acepta API key v3 o Read Access Token Bearer. La clave nunca se envía al navegador y no usa variables de entorno.
3. Sube los archivos PHP indicados en [DESPLIEGUE.md](docs/DESPLIEGUE.md), incluidas las modificaciones de `index.php` y `telegram.php`.
4. Revisa `public/runtime-config.js`: configuración pública Firebase del proyecto existente `alonsoftware` y URL base de la API. En localhost usa `http://localhost/OV2/api`; en otros dominios, `https://alon.one/api`. Si MAMP escucha en 8888, cambia la URL local. MAMP debe estar arrancado para los flujos reales.
5. En Firebase Authentication, habilita Google y correo/contraseña y autoriza el dominio donde publiques la PWA y los dominios locales usados. El registro por correo envía verificación y el login entrega el ID token a `auth/login`.
6. Configura `$appUrl` en la clase `pelisenpareja` con la URL definitiva del frontend. Por defecto: `https://pelisenpareja.alon.one`. Publica la build allí, sobre HTTPS.
7. Instala el cron de avisos Telegram cada minuto. Reutiliza el bot, la configuración y el webhook de `telegram.php`, sin crear un bot nuevo. Los pasos están en [DESPLIEGUE.md](docs/DESPLIEGUE.md).
8. El servidor debe tener un transporte de correo operativo para `mail()`. Si no acepta el envío, la invitación se guarda y la app permite copiar el enlace, indicando que el correo no se envió.

## Comportamiento

- Múltiples grupos, hasta 20 grupos por persona y 20 miembros por grupo.
- El propietario elige las preferencias compartidas, invita por correo, renueva códigos y retira miembros. Cualquier miembro puede compartir el código y salir del grupo.
- Al salir el propietario se transfiere la propiedad; el último miembro elimina el grupo.
- Región inicial España. Plataformas reales de TMDB/JustWatch, títulos incluidos en suscripciones (`flatrate`). No se incluyen alquileres o compras.
- Países excluidos por origen/producción, incluidas coproducciones; no se confunde país con idioma.
- Películas y series tienen IDs independientes. Los votos son por grupo, usuario, tipo e ID TMDB.
- Hace falta un mínimo de dos miembros para un match. Entradas, salidas y cambios de voto recalculan el consenso.
- Una película vista desaparece también de matches. Los votos no se muestran a los demás antes del consenso.
- Avisos internos persistentes y Telegram mediante cola con reintentos. El navegador recibe avisos mientras la app está abierta; para avisos con la app cerrada se usa Telegram.
- Sin conexión abre la interfaz previamente instalada; los votos requieren conexión. Los datos privados y el auth no se almacenan en la caché del service worker.
- La PWA avisa cuando hay una actualización lista y permite recargarla.

## Verificación

```bash
npm test
npm run build
```

7 pruebas de gestos, duraciones, iconos PWA y privacidad de caché. El backend incluye 18 comprobaciones de integración con MySQL local desechable en `api/tests/pelisenpareja_consensus.php`; ese test requiere un socket local bajo `/tmp/pelisenpareja*.sock` y nunca conecta a producción.

Ver [VALIDACION.md](docs/VALIDACION.md) para las comprobaciones realizadas y sus límites. El catálogo vivo, el acceso Firebase, el correo y Telegram requieren el despliegue/configuración anterior.

## Contexto para continuar

- [CONTEXTO.md](docs/CONTEXTO.md): requisitos, decisiones y estado pendiente.
- [ARQUITECTURA.md](docs/ARQUITECTURA.md): flujo de datos y consenso.
- [API.md](docs/API.md): endpoints y contratos.
- [DESPLIEGUE.md](docs/DESPLIEGUE.md): instalación PHP, MySQL, cron y PWA.
- `AGENTS.md`: instrucciones del repositorio para siguientes sesiones.

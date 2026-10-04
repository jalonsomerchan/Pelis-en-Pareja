# GitHub Pages: pelisenpareja.alon.one

El frontend está preparado para `https://pelisenpareja.alon.one/`. La API de producción sigue en `https://alon.one/api`; en `localhost` y `127.0.0.1` usa `http://localhost/OV2/api`.

## Archivos preparados

- `.github/workflows/deploy-pages.yml`: instala con `npm ci`, ejecuta las pruebas, compila y publica el frontend al hacer push a `main`. También permite ejecución manual desde Actions sobre `main`.
- `npm run build:pages`: build de producción con `<base href="/">` y service worker.
- `public/CNAME`: dominio `pelisenpareja.alon.one`, copiado a la build. Con despliegue por Actions, el dominio se configura en Settings → Pages; GitHub no usa este archivo para configurarlo.
- Artefacto publicado: exclusivamente `dist/pelis-en-pareja/browser`. PHP y MySQL se despliegan en el servidor de la API.

El workflow usa las acciones oficiales de Pages y el token automático de GitHub. No necesita PAT ni claves TMDB/Telegram en GitHub Secrets. Ver [workflows oficiales de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Configuración en GitHub y DNS

1. Sube este proyecto a un repositorio de GitHub con rama `main`, incluyendo `.github` y `package-lock.json`. Esta carpeta todavía no tiene un repositorio Git ni un remoto configurado.
2. En **Settings → Pages → Build and deployment**, selecciona **GitHub Actions** como Source.
3. En **Custom domain**, guarda `pelisenpareja.alon.one` antes de modificar el DNS.
4. En el DNS de `alon.one`, configura este registro, sustituyendo el destino por el propietario real del repositorio:

   | Tipo | Nombre | Destino |
   | --- | --- | --- |
   | CNAME | `pelisenpareja` | `<USUARIO_O_ORGANIZACION>.github.io` |

   El destino no lleva `https://` ni el nombre del repositorio. Este registro afecta solo al subdominio del frontend. Sigue las [instrucciones oficiales para subdominios](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-a-subdomain).

5. Cuando GitHub valide el dominio y emita el certificado, activa **Enforce HTTPS** en Pages.
6. Autoriza `pelisenpareja.alon.one` en **Firebase Authentication → Settings → Authorized domains** del proyecto `alonsoftware`.
7. Haz push a `main` o ejecuta **Publicar frontend en GitHub Pages** desde Actions. El entorno de despliegue es `github-pages`; debe permitir la rama `main`.

Si el repositorio usa otra rama de publicación, ajusta tanto `on.push.branches` como la condición `jobs.deploy.if` del workflow.

## Verificación local y posterior al despliegue

```bash
npm ci
npm test
npm run build:pages
npm run preview
```

El dominio personalizado sirve la app en `/`, incluso si el repositorio tiene otro nombre. Las vistas actuales no usan rutas de Angular Router: las invitaciones son `/?invitation=...`, por lo que no requieren reglas de reescritura. GitHub Pages ignora la `.htaccess` usada al publicar en Apache y administra sus propias cabeceras HTTP.

Tras publicar, comprueba el acceso en HTTPS, el login, una invitación, las peticiones a `https://alon.one/api`, la instalación PWA y la detección de una actualización. El CORS del router local de la API ya admite `pelisenpareja.alon.one`; ese router debe estar desplegado en producción. El atributo backend `$appUrl` ya tiene `https://pelisenpareja.alon.one`.

La preparación y la build local no publican el sitio ni configuran DNS, Pages o Firebase. La migración y el despliegue del backend siguen los pasos de `DESPLIEGUE.md`.

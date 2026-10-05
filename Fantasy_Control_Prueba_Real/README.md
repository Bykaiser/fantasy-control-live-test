# Fantasy Control · prueba de datos reales

Prueba de solo lectura para ver **tu cuenta, ligas, clasificación, plantillas y mercado** de LaLiga Fantasy en una web. Código JavaScript, publicado desde GitHub con Cloudflare Workers; no requiere Python ni instalar nada en el portátil del trabajo.

**Estado comprobado:** el usuario desplegó la primera versión en Cloudflare. Las pruebas locales usan respuestas simuladas y ahora reflejan los campos y el encabezado usados por su script de móvil. Falta probarlo con una sesión real de LaLiga. La API de Fantasy es privada y puede cambiar. Esta prueba tampoco sustituye el panel de deudas y pagos de la web anterior.

## Cómo se conecta

La página solicita un **access token temporal** de una sesión tuya ya iniciada en Fantasy. Lo guarda en memoria de la pestaña y lo envía solamente a su propio Worker por HTTPS. El Worker llama a Fantasy, sin almacenar el token ni pedir contraseña. Cuando cierres o recargues la pestaña, hay que introducirlo de nuevo. No introduzcas contraseñas, refresh tokens ni tokens en un issue, en GitHub, en capturas ni en un chat.

El enlace de login de FantasyStats no da el token a esta web: el código vuelve a una app móvil. El script `fantasy app 2.py` del usuario guarda su sesión en `fantasy_config.json`, en el mismo dispositivo. Para esta prueba puedes copiar **únicamente** `access_token` de ese archivo y pegarlo en la web desde el mismo dispositivo. No envíes el archivo, el token ni capturas de su contenido. Esta prueba no renueva la sesión automáticamente ni ofrece un inicio de sesión con LaLiga: requiere un flujo web propio con una URL de retorno autorizada por el proveedor.

## Publicar sin terminal

1. Crea en GitHub un repositorio nuevo llamado `fantasy-control-live-test`. En **Add file → Upload files**, arrastra el contenido de esta carpeta: `package.json`, `wrangler.jsonc`, `README.md` y las carpetas `src`, `public`, `test`. Comprueba que `public/index.html` y `src/worker.js` conservan esas rutas. Haz **Commit changes**.
2. En el panel de Cloudflare, abre **Workers & Pages → Create application → Workers → Import a repository** (el nombre del botón puede variar). Vincula GitHub y elige **solo** ese repositorio. El nombre de Worker debe coincidir con `fantasy-control-live-test` del archivo `wrangler.jsonc`.
3. Rama de producción: `main`. Directorio raíz: `/`. Comando de construcción: vacío (o `npm install` si el formulario lo exige). Comando de despliegue: `npx wrangler deploy`. Confirma la creación en Cloudflare.
4. Abre el enlace `*.workers.dev` que Cloudflare muestre. Comprueba que aparece el formulario de conexión. En esta fase verás «Sin conectar»; es correcto.

Cloudflare necesita que autorices la conexión de su aplicación con GitHub. No concedas acceso a todos tus repositorios si puedes elegir únicamente `fantasy-control-live-test`. No pongas el token en variables de entorno de GitHub ni en un archivo del repositorio.

## Prueba con una sesión propia

Puedes seleccionar `fantasy_config.json` con el selector de archivos de la web. Se analiza en el navegador y se extrae únicamente `access_token`; el archivo completo y el token de renovación no se envían al servidor. La sesión sigue siendo temporal y se borra al cerrar o recargar la pestaña.

En la página `*.workers.dev`, pega **solo el token de acceso**, pulsa «Conectar y ver ligas», selecciona una liga y pulsa «Ver jugadores» en un equipo. Si no reconoce un formato de respuesta, mostrará un error legible: no inventará nombres o valores. La pantalla consulta endpoints de solo lectura de la competición `1` (Primera División, temporada 2026/27).

Este prototipo consulta una API no publicada para terceros. Puede dejar de funcionar con cambios de Fantasy. Muestra cláusulas recibidas en la plantilla, pero no ejecuta operaciones de mercado ni almacena datos personales en servidor. La página pública de acceso no equivale a un login privado; la información de tu liga solo se solicita si alguien tiene un token de acceso válido.

## Verificación del código

`npm test` ejecuta pruebas con respuestas ficticias de rutas, bloqueo de escrituras y mapeo de jugadores. No intenta iniciar sesión ni usa credenciales reales.

### Fuentes técnicas

- [Catálogo de rutas descrito por un proyecto independiente](https://github.com/sergioalmela/la-liga-fantasy-analyzer/blob/main/docs/api-2026-27.md)
- [Cloudflare Workers con archivos estáticos](https://developers.cloudflare.com/workers/static-assets/)
- [Despliegue de Cloudflare desde GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)

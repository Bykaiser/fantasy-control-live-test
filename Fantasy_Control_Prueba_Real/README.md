# Fantasy Control · prueba de datos reales

Prueba de solo lectura para ver **tu cuenta, ligas, clasificación, plantillas y mercado** de LaLiga Fantasy en una web. Código JavaScript, publicado desde GitHub con Cloudflare Workers; no requiere Python ni instalar nada en el portátil del trabajo.

**Estado comprobado:** la página y el proxy tienen pruebas locales con respuestas simuladas. No se ha probado todavía con una sesión real de LaLiga ni se ha desplegado. La API de Fantasy es privada y puede cambiar. Esta prueba tampoco sustituye el panel de deudas y pagos de la web anterior.

## Cómo se conecta

La página solicita un **access token temporal** de una sesión tuya ya iniciada en Fantasy. Lo guarda en memoria de la pestaña y lo envía solamente a su propio Worker por HTTPS. El Worker llama a Fantasy, sin almacenar el token ni pedir contraseña. Cuando cierres o recargues la pestaña, hay que introducirlo de nuevo. No introduzcas contraseñas, refresh tokens ni tokens en un issue, en GitHub, en capturas ni en un chat.

El enlace de login de FantasyStats no da el token a esta web: el código vuelve a una app móvil. Hay que obtener el token de acceso de una sesión propia **por un método fiable en un dispositivo tuyo**. Todavía no se ha documentado un método fiable para exportarlo desde FantasyStats en iPhone; por eso esta prueba no promete que el botón conecte solo. Si no dispones del access token, la web podrá desplegarse pero no mostrará tus jugadores.

## Publicar sin terminal

1. Crea en GitHub un repositorio nuevo llamado `fantasy-control-live-test`. En **Add file → Upload files**, arrastra el contenido de esta carpeta: `package.json`, `wrangler.jsonc`, `README.md` y las carpetas `src`, `public`, `test`. Comprueba que `public/index.html` y `src/worker.js` conservan esas rutas. Haz **Commit changes**.
2. En el panel de Cloudflare, abre **Workers & Pages → Create application → Workers → Import a repository** (el nombre del botón puede variar). Vincula GitHub y elige **solo** ese repositorio. El nombre de Worker debe coincidir con `fantasy-control-live-test` del archivo `wrangler.jsonc`.
3. Rama de producción: `main`. Directorio raíz: `/`. Comando de construcción: vacío (o `npm install` si el formulario lo exige). Comando de despliegue: `npx wrangler deploy`. Confirma la creación en Cloudflare.
4. Abre el enlace `*.workers.dev` que Cloudflare muestre. Comprueba que aparece el formulario de conexión. En esta fase verás «Sin conectar»; es correcto.

Cloudflare necesita que autorices la conexión de su aplicación con GitHub. No concedas acceso a todos tus repositorios si puedes elegir únicamente `fantasy-control-live-test`. No pongas el token en variables de entorno de GitHub ni en un archivo del repositorio.

## Prueba con una sesión propia

En la página `*.workers.dev`, pega **solo el token de acceso**, pulsa «Conectar y ver ligas», selecciona una liga y pulsa «Ver jugadores» en un equipo. Si no reconoce un formato de respuesta, mostrará un error legible: no inventará nombres o valores. La pantalla consulta endpoints de solo lectura de la competición `1` (Primera División, temporada 2026/27).

Este prototipo consulta una API no publicada para terceros. Puede dejar de funcionar con cambios de Fantasy. No ofrece operaciones de mercado ni almacena datos personales en servidor. La página pública de acceso no equivale a un login privado; la información de tu liga solo se solicita si alguien tiene un token de acceso válido.

## Verificación del código

`npm test` ejecuta pruebas con respuestas ficticias de rutas, bloqueo de escrituras y mapeo de jugadores. No intenta iniciar sesión ni usa credenciales reales.

### Fuentes técnicas

- [Catálogo de rutas descrito por un proyecto independiente](https://github.com/sergioalmela/la-liga-fantasy-analyzer/blob/main/docs/api-2026-27.md)
- [Cloudflare Workers con archivos estáticos](https://developers.cloudflare.com/workers/static-assets/)
- [Despliegue de Cloudflare desde GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)

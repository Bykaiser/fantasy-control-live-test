# Fantasy Control · prueba de datos reales

Web de lectura para consultar la cuenta, ligas, clasificación, plantillas, mercado y cláusulas de LaLiga Fantasy. Desplegada desde GitHub con Cloudflare Workers. No requiere instalar Python.

## Acceso con correo y contraseña

El formulario adapta `login_password()` del script de móvil proporcionado por el usuario: el Worker envía una petición de contraseña a la política `B2C_1A_ResourceOwnerv2` del servidor de login de LaLiga con los parámetros del script. Utiliza un cliente existente de Fantasy y una API privada, por lo que el proveedor puede rechazar este uso o cambiar el servicio. No es un flujo OAuth web propio registrado ni una integración oficial.

El correo y la contraseña pasan por el Worker para enviarse al servidor de LaLiga mediante HTTPS. Este código no los persiste ni registra. La respuesta entrega al navegador únicamente el token de acceso (o el id_token si el proveedor solo devuelve ese campo, siguiendo el script). Se mantiene en memoria de la pestaña y se elimina al cerrar, recargar o pulsar Olvidar sesión. No se almacena ni utiliza el refresh_token, por lo que hay que volver a entrar cuando caduque la sesión.

También están disponibles el token manual y la selección de `fantasy_config.json` como opciones adicionales. El archivo se analiza en el navegador y solo se extrae access_token.

## Estado y pruebas

La versión previa está desplegada y el formulario se prueba localmente con respuestas ficticias: parámetros del login, bloqueo de orígenes externos, validación del cuerpo, respuestas sin contraseña ni tokens de renovación y lectura de datos Fantasy. No se ha comprobado todavía el login con credenciales reales desde Cloudflare. Las pruebas locales no demuestran que LaLiga permita la conexión del Worker.

No envíes contraseñas, tokens ni archivos de sesión por chat, issues o GitHub. Para probar, introduce tus datos únicamente en tu página de Fantasy Control.

## Despliegue existente

Repositorio: Bykaiser/fantasy-control-live-test. Rama: main. Cloudflare usa el directorio `/Fantasy_Control_Prueba_Real` y el comando `npx wrangler deploy`. Los commits en main desencadenan la construcción y el despliegue.

## Datos

Las rutas de Fantasy son exclusivamente de consulta y de la competición 1. No se ejecutan fichajes, pagos ni cláusulas. Los campos ausentes se muestran sin inventar datos. La página de acceso es pública y la liga solo se consulta con una sesión válida; no existe control de acceso exclusivo para amigos. No se incluye aún el panel de deudas 3/2/1 €.

## Verificación

`npm test`: pruebas con respuestas ficticias, sin credenciales reales.

## Referencias

- Script Python de móvil aportado por el usuario: login_password, api y fetch_real.
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/

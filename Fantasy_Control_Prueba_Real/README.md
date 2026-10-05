# Fantasy Control · prueba de datos reales

Web de lectura para consultar la cuenta, ligas, clasificación, plantillas, mercado y cláusulas de LaLiga Fantasy. Desplegada desde GitHub con Cloudflare Workers. No requiere instalar Python.

## Acceso con correo y contraseña

El formulario adapta `login_password()` del script de móvil proporcionado por el usuario: el Worker envía una petición de contraseña a la política `B2C_1A_ResourceOwnerv2` del servidor de login de LaLiga con los parámetros del script. Utiliza un cliente existente de Fantasy y una API privada, por lo que el proveedor puede rechazar este uso o cambiar el servicio. No es un flujo OAuth web propio registrado ni una integración oficial.

El correo y la contraseña pasan por el Worker para enviarse al servidor de LaLiga mediante HTTPS. Este código no los persiste ni registra. La respuesta entrega al navegador únicamente el token de acceso (o el id_token si el proveedor solo devuelve ese campo, siguiendo el script). Se mantiene en memoria de la pestaña y se elimina al cerrar, recargar o pulsar Desconectar. No se almacena ni utiliza el refresh_token, por lo que hay que volver a entrar cuando caduque la sesión.

También están disponibles el token manual y la selección de `fantasy_config.json` como opciones adicionales. El archivo se analiza en el navegador y solo se extrae access_token.

## Estado y pruebas

El usuario ha confirmado el acceso con correo y contraseña y la recepción de datos reales desde la web desplegada. La nueva interfaz incluye Mi Equipo, Mercado, Mi Liga, Buscar y fichas de jugadores. Las pruebas automatizadas usan respuestas ficticias y no credenciales reales. Los campos y rutas de una API privada pueden cambiar.

No envíes contraseñas, tokens ni archivos de sesión por chat, issues o GitHub. Para probar, introduce tus datos únicamente en tu página de Fantasy Control.

## Despliegue existente

Repositorio: Bykaiser/fantasy-control-live-test. Rama: main. Cloudflare usa el directorio `/Fantasy_Control_Prueba_Real` y el comando `npx wrangler deploy`. Los commits en main desencadenan la construcción y el despliegue.

## Datos

Las rutas de Fantasy son exclusivamente de consulta y de la competición 1. No se ejecutan fichajes, pagos ni cláusulas. Los campos ausentes se muestran sin inventar datos. La página de acceso es pública y la liga solo se consulta con una sesión válida; no existe control de acceso exclusivo para amigos. No se incluye aún el panel de deudas 3/2/1 €.

## Interfaz e historial

- Mi Equipo: valor de plantilla, saldo disponible, valor del club, alineación y ordenación de jugadores.
- Mercado: precios, pujas, filtros de posición, cláusulas y favoritos. Las cláusulas consultan las plantillas de la liga con concurrencia limitada.
- Mi Liga: clasificación y acceso a cada plantilla.
- Buscar: catálogo de jugadores y consulta de propietarios.
- Ficha: valor, puntos, media, cláusula, historial y próximos rivales cuando la API los entrega.

El navegador guarda una observación por día (máximo 120) y favoritos, separados por cuenta y liga. No guarda contraseñas ni tokens. Las variaciones requieren una observación de la fecha correspondiente; el histórico anterior a la primera consulta no se reconstruye. Las proyecciones lineales experimentales necesitan al menos siete observaciones en siete días y no incluyen lesiones, titularidad ni rivales. No se inventan porcentajes de titularidad o confianza.

## Verificación

`npm test`: pruebas con respuestas ficticias, sin credenciales reales.

## Referencias

- Script Python de móvil aportado por el usuario: login_password, api y fetch_real.
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/

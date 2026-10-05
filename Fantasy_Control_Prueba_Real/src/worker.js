// Prototipo de lectura: la sesión se entrega por petición y no se almacena.
const UPSTREAM = 'https://fantasy-api.llt-services.com/api';
const COMPETITION = '/v1/competition/1';
const LOGIN_URL = 'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2';
const CLIENT_ID = 'af88bcff-1157-40a0-b579-030728aacf0b';
const ID = '[A-Za-z0-9_-]{1,80}';
const routes = [
  [/^\/api\/me$/, () => '/v4/user/me'],
  [/^\/api\/leagues$/, () => `${COMPETITION}/leagues`],
  [new RegExp(`^/api/league/(${ID})/standing$`), ([, league]) => `${COMPETITION}/leagues/${league}/standing`],
  [new RegExp(`^/api/league/(${ID})/standing/([0-9]{1,3})$`), ([, league, week]) => `${COMPETITION}/leagues/${league}/standing/${week}`],
  [new RegExp(`^/api/league/(${ID})/team/(${ID})$`), ([, league, team]) => `${COMPETITION}/leagues/${league}/teams/${team}`],
  [new RegExp(`^/api/league/(${ID})/market$`), ([, league]) => `${COMPETITION}/league/${league}/market`],
  [/^\/api\/week$/, () => `${COMPETITION}/week/current`],
  [/^\/api\/players$/, () => `${COMPETITION}/players`],
  [/^\/api\/clubs$/, () => '/v3/teams-master'],
  [new RegExp(`^/api/team/(${ID})/money$`), ([, team]) => `${COMPETITION}/teams/${team}/money`],
  [new RegExp(`^/api/team/(${ID})/lineup$`), ([, team]) => `${COMPETITION}/teams/${team}/lineup`],
  [new RegExp(`^/api/league/(${ID})/player/(${ID})$`), ([, league, player]) => `${COMPETITION}/player/${player}/league/${league}`],
  [/^\/api\/calendar\/([0-9]{1,2})$/, ([,week]) => `${COMPETITION}/calendar?weekNumber=${week}`],
];

export function upstreamPath(pathname) {
  for (const [pattern, build] of routes) {
    const match = pathname.match(pattern);
    if (match) return build(match);
  }
  return null;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  });
}

async function login(request) {
  if (request.method !== 'POST') return json({error:'Usa el formulario para iniciar sesión.'}, 405);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json'))
    return json({error:'Formato de solicitud no permitido.'}, 415);
  let credentials;
  try {
    const text = await request.text();
    if (text.length > 16384) return json({error:'Solicitud demasiado grande.'}, 413);
    credentials = JSON.parse(text);
  } catch { return json({error:'Solicitud no válida.'}, 400); }
  const email = typeof credentials?.email === 'string' ? credentials.email.trim() : '';
  const password = credentials?.password;
  if (!email || email.length > 320 || !email.includes('@') || typeof password !== 'string' || !password || password.length > 4096)
    return json({error:'Introduce tu correo y contraseña de LaLiga.'}, 400);
  try {
    const response = await fetch(LOGIN_URL, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
      body:new URLSearchParams({grant_type:'password',client_id:CLIENT_ID,
        scope:`openid ${CLIENT_ID} offline_access`,redirect_uri:'authredirect://com.lfp.laligafantasy',
        username:email,password,response_type:'id_token'}),
      redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000),
    });
    if (!(response.headers.get('Content-Type') || '').toLowerCase().includes('application/json'))
      return json({error:'LaLiga no devolvió una respuesta de inicio de sesión válida.'},502);
    const data = await response.json();
    if (!response.ok) {
      // Solo devolver un código de diagnóstico; nunca el texto que pueda contener datos de la cuenta.
      const code = String(data?.error_description || '').match(/AADB2C\d{5}/)?.[0];
      return json({error:'LaLiga ha rechazado el inicio de sesión. Comprueba tus datos; este método puede no estar disponible para tu cuenta.', ...(code ? {code} : {})},response.status === 400 || response.status === 401 ? 401 : 502);
    }
    const token = data?.access_token || data?.id_token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9._~+\/-]{20,8192}={0,2}$/.test(token))
      return json({error:'LaLiga no entregó una sesión utilizable.'},502);
    // No persistir contraseña ni sesión. No devolver refresh_token ni perfiles del proveedor.
    return json({access_token:token});
  } catch { return json({error:'No se pudo contactar con el inicio de sesión de LaLiga. Inténtalo de nuevo.'},502); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    // El navegador solo puede llamar desde la propia página; otras aplicaciones
    // que conozcan un token seguirían necesitando poseer ese token.
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'Origen no permitido.' }, 403);
    const site = request.headers.get('Sec-Fetch-Site');
    if (site === 'cross-site') return json({ error: 'Origen no permitido.' }, 403);
    if (url.pathname === '/api/login' && !url.search) {
      if (origin !== url.origin) return json({error:'Inicia sesión desde la web de Fantasy Control.'},403);
      return login(request);
    }
    if (request.method !== 'GET') return json({ error: 'Solo lectura.' }, 405);
    const path = upstreamPath(url.pathname);
    if (!path || url.search) return json({ error: 'Ruta de lectura no disponible.' }, 404);
    const authorization = request.headers.get('Authorization') || '';
    if (!/^Bearer [A-Za-z0-9._~+\/-]{20,8192}={0,2}$/.test(authorization))
      return json({ error: 'Introduce un token de acceso válido en esta página.' }, 401);
    try {
      const target = new URL(UPSTREAM + path);
      target.searchParams.set('x-lang', 'es');
      const upstream = await fetch(target, {
        method: 'GET',
        headers: { Authorization: authorization, Accept: 'application/json', 'x-lang': 'es', 'x-app': '2' },
        redirect: 'manual',
        cache: 'no-store',
      });
      if (upstream.status >= 300 && upstream.status < 400)
        return json({ error: 'Redirección inesperada de Fantasy.' }, 502);
      if (upstream.status === 401 || upstream.status === 403)
        return json({ error: 'La sesión no tiene acceso o ha caducado.' }, upstream.status);
      if (!upstream.ok)
        return json({ error: 'Fantasy no devolvió los datos solicitados.', status: upstream.status }, 502);
      if (!(upstream.headers.get('Content-Type') || '').toLowerCase().includes('application/json'))
        return json({ error: 'Respuesta inesperada de Fantasy.' }, 502);
      const body = await upstream.text();
      if (body.length > 3_000_000) return json({ error: 'Respuesta demasiado grande.' }, 502);
      const data = JSON.parse(body);
      return json(data);
    } catch {
      // Nunca registrar tokens, encabezados ni cuerpos de la respuesta.
      return json({ error: 'No se pudo consultar Fantasy en este momento.' }, 502);
    }
  },
};

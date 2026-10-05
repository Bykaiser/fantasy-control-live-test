// Prototipo de lectura: la sesión se entrega por petición y no se almacena.
const UPSTREAM = 'https://fantasy-api.llt-services.com/api';
const COMPETITION = '/v1/competition/1';
const ID = '[A-Za-z0-9_-]{1,80}';
const routes = [
  [/^\/api\/me$/, () => '/v4/user/me'],
  [/^\/api\/leagues$/, () => `${COMPETITION}/leagues`],
  [new RegExp(`^/api/league/(${ID})/standing$`), ([, league]) => `${COMPETITION}/leagues/${league}/standing`],
  [new RegExp(`^/api/league/(${ID})/standing/([0-9]{1,3})$`), ([, league, week]) => `${COMPETITION}/leagues/${league}/standing/${week}`],
  [new RegExp(`^/api/league/(${ID})/team/(${ID})$`), ([, league, team]) => `${COMPETITION}/leagues/${league}/teams/${team}`],
  [new RegExp(`^/api/league/(${ID})/market$`), ([, league]) => `${COMPETITION}/league/${league}/market`],
  [/^\/api\/week$/, () => `${COMPETITION}/week/current`],
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return json({ error: 'Solo lectura.' }, 405);
    // El navegador solo puede llamar desde la propia página; otras aplicaciones
    // que conozcan un token seguirían necesitando poseer ese token.
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'Origen no permitido.' }, 403);
    const site = request.headers.get('Sec-Fetch-Site');
    if (site === 'cross-site') return json({ error: 'Origen no permitido.' }, 403);
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

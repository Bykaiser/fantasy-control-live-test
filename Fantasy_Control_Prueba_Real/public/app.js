import {collection, profileName, leagueId, leagueName, standings, teamId, teamName, teamPoints, teamValue, isMyTeam, players, playerName, playerValue, playerPosition, playerClause, marketPrice} from './view-model.js';
import {accessTokenFromConfig} from './session-token.js';

// Se mantiene solo en la memoria de esta pestaña. Nunca se persiste.
let token = '';
let activeLeague = null;
let userId = null;
const el = id => document.getElementById(id);
function setStatus(message, kind = '') { el('connection-status').textContent = message; el('connection-status').className = `status ${kind}`; }
function clear(node) { node.replaceChildren(); }
function cell(tag, text, className) { const n = document.createElement(tag); n.textContent = String(text ?? '—'); if (className) n.className = className; return n; }
function card(title, details, button) {
  const item = cell('article', '', 'item'); item.append(cell('h3', title));
  for (const [key, value] of details) item.append(cell('p', `${key}: ${value}`));
  if (button) { const b = cell('button', button.label); b.type = 'button'; b.addEventListener('click', button.action); item.append(b); }
  return item;
}
async function read(path) {
  if (!token) throw new Error('La sesión se ha cerrado.');
  const response = await fetch(path, {headers: {'Authorization': `Bearer ${token}`, 'Accept': 'application/json'}, cache: 'no-store'});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Respuesta ${response.status}`);
  return data;
}
function showPlayers(raw, title, target, count, message) {
  const list = players(raw);
  el(title).textContent = teamName(raw) || 'Plantilla';
  el(count).textContent = `${list.length} jugadores`;
  const root = el(target); clear(root);
  if (!list.length) { el(message).textContent = 'La API no entregó una lista de jugadores reconocible para esta plantilla.'; return; }
  el(message).textContent = '';
  for (const entry of list) root.append(card(playerName(entry), [['Posición', playerPosition(entry)], ['Valor', playerValue(entry)], ['Cláusula', playerClause(entry)]]));
}
async function loadTeam(league, team, label) {
  el('team-message').textContent = `Cargando plantilla de ${label}…`;
  try {
    const raw = await read(`/api/league/${encodeURIComponent(league)}/team/${encodeURIComponent(team)}`);
    showPlayers(raw, 'team-title', 'players', 'players-count', 'team-message');
    el('team-title').textContent = `Plantilla · ${label}`;
  } catch (error) { el('team-message').textContent = error.message; clear(el('players')); }
}
async function loadLeague(league) {
  if (!league) return;
  activeLeague = league;
  el('content').hidden = false;
  el('league-message').textContent = 'Consultando la liga…';
  clear(el('standings')); clear(el('players')); clear(el('market'));
  el('team-title').textContent = 'Plantilla'; el('team-message').textContent = 'Elige un equipo de la clasificación.';
  el('market-message').textContent = 'Cargando mercado…';
  const [standingResult, marketResult] = await Promise.allSettled([
    read(`/api/league/${encodeURIComponent(league)}/standing`),
    read(`/api/league/${encodeURIComponent(league)}/market`),
  ]);
  if (activeLeague !== league) return;
  if (standingResult.status === 'fulfilled') {
    const list = standings(standingResult.value); el('standing-count').textContent = `${list.length} equipos`;
    el('league-message').textContent = list.length ? 'Selecciona un equipo para ver sus jugadores.' : 'La API no devolvió equipos reconocibles; revisa el contrato de respuesta.';
    for (const item of list) {
      const id = teamId(item), name = teamName(item);
      el('standings').append(card(name, [['Puntos', teamPoints(item)], ['Valor', teamValue(item)]], id ? {label:'Ver jugadores', action:()=>loadTeam(league, id, name)} : null));
    }
    const mine = list.find(item => isMyTeam(item, userId));
    if (mine && teamId(mine)) await loadTeam(league, teamId(mine), teamName(mine));
  } else el('league-message').textContent = `No se pudo cargar la clasificación: ${standingResult.reason.message}`;
  if (marketResult.status === 'fulfilled') {
    const list = collection(marketResult.value, ['market', 'players', 'offers', 'items']);
    el('market-count').textContent = `${list.length} fichas`;
    el('market-message').textContent = list.length ? '' : 'La API no devolvió fichas de mercado reconocibles.';
    for (const item of list.slice(0,100)) el('market').append(card(playerName(item), [['Valor',playerValue(item)],['Precio',marketPrice(item)],['Pujas',item.numberOfBids ?? '—']]));
  } else el('market-message').textContent = `Mercado no disponible: ${marketResult.reason.message}`;
}
el('session-file').addEventListener('change', async event => {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('El archivo de sesión es demasiado grande.');
    el('token').value = accessTokenFromConfig(await file.text());
    el('connect-form').requestSubmit();
  } catch (error) { setStatus(error.message, 'error'); }
  finally { input.value = ''; }
});
el('connect-form').addEventListener('submit', async event => {
  event.preventDefault(); const input = el('token'); const candidate = input.value.trim(); input.value = '';
  if (!candidate) return;
  const button = event.submitter; if (button) button.disabled = true;
  try { await connect(candidate); }
  finally { if (button) button.disabled = false; }
});
async function connect(candidate) {
  token = candidate; setStatus('Comprobando la sesión y buscando tus ligas…');
  try {
    const me = await read('/api/me');
    userId = me.id ?? me.userId ?? me.user?.id ?? null;
    const raw = await read('/api/leagues');
    const list = collection(raw, ['leagues', 'items']);
    if (!list.length) throw new Error('La cuenta responde, pero no se encontraron ligas con un formato conocido.');
    el('account-name').textContent = profileName(me);
    const select = el('league-select'); clear(select);
    for (const item of list) {
      const id = leagueId(item); if (!id) continue;
      const option = document.createElement('option'); option.value = id; option.textContent = leagueName(item); select.append(option);
    }
    if (!select.options.length) throw new Error('La cuenta no devolvió identificadores de liga reconocibles.');
    setStatus(`Conexión válida. ${select.options.length} liga(s) encontradas.`, 'good');
    el('connect-controls').hidden = true;
    el('disconnect').hidden = false; el('leagues').hidden = false;
    await loadLeague(select.value);
  } catch (error) { token = ''; setStatus(error.message, 'error'); }
}
el('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  if (button) button.disabled = true;
  const email = el('email').value.trim();
  const password = el('password').value;
  el('password').value = '';
  setStatus('Iniciando sesión en LaLiga…');
  try {
    const response = await fetch('/api/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'});
    const data = await response.json();
    if (!response.ok) throw new Error(`${data.error || 'No se pudo iniciar sesión.'}${data.code ? ` (${data.code})` : ''}`);
    await connect(data.access_token);
  } catch (error) { token = ''; setStatus(error.message, 'error'); }
  finally { if (button) button.disabled = false; }
});
el('league-select').addEventListener('change', event => loadLeague(event.target.value));
el('reload').addEventListener('click', () => loadLeague(el('league-select').value));
el('disconnect').addEventListener('click', () => { token = ''; activeLeague = null; userId = null; el('connect-controls').hidden = false; el('password').value = ''; el('disconnect').hidden = true; el('leagues').hidden = true; el('content').hidden = true; clear(el('standings')); clear(el('players')); clear(el('market')); setStatus('Sesión olvidada.'); });

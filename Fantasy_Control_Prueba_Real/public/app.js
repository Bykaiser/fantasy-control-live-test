import {collection, profileName, leagueId, leagueName, standings, teamId, teamName, players, playerName, playerValue} from './view-model.js';

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
  for (const entry of list) root.append(card(playerName(entry), [['Posición', entry.position?.name || entry.position || entry.player?.position?.name || '—'], ['Valor', playerValue(entry)]]));
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
      el('standings').append(card(name, [['Puntos', item.points ?? item.totalPoints ?? item.score ?? '—'], ['Valor', playerValue(item)]], id ? {label:'Ver jugadores', action:()=>loadTeam(league, id, name)} : null));
    }
    const mine = list.find(item => item.isMyTeam || item.myTeam || (userId != null && String(item.owner?.id) === String(userId)));
    if (mine && teamId(mine)) await loadTeam(league, teamId(mine), teamName(mine));
  } else el('league-message').textContent = `No se pudo cargar la clasificación: ${standingResult.reason.message}`;
  if (marketResult.status === 'fulfilled') {
    const list = collection(marketResult.value, ['market', 'players', 'offers', 'items']);
    el('market-count').textContent = `${list.length} fichas`;
    el('market-message').textContent = list.length ? '' : 'La API no devolvió fichas de mercado reconocibles.';
    for (const item of list.slice(0,100)) el('market').append(card(playerName(item), [['Valor',playerValue(item)],['Precio',playerValue({value:item.salePrice ?? item.price ?? item.amount})]]));
  } else el('market-message').textContent = `Mercado no disponible: ${marketResult.reason.message}`;
}
el('connect-form').addEventListener('submit', async event => {
  event.preventDefault(); const input = el('token'); const candidate = input.value.trim(); input.value = '';
  if (!candidate) return;
  const button = event.submitter; if (button) button.disabled = true;
  token = candidate; setStatus('Comprobando la sesión y buscando tus ligas…');
  try {
    const me = await read('/api/me');
    userId = me.id ?? me.user?.id ?? null;
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
    el('connection').querySelector('form').hidden = true;
    el('disconnect').hidden = false; el('leagues').hidden = false;
    await loadLeague(select.value);
  } catch (error) { token = ''; setStatus(error.message, 'error'); }
  finally { if (button) button.disabled = false; }
});
el('league-select').addEventListener('change', event => loadLeague(event.target.value));
el('reload').addEventListener('click', () => loadLeague(el('league-select').value));
el('disconnect').addEventListener('click', () => { token = ''; activeLeague = null; userId = null; el('connect-form').hidden = false; el('disconnect').hidden = true; el('leagues').hidden = true; el('content').hidden = true; clear(el('standings')); clear(el('players')); clear(el('market')); setStatus('Sesión olvidada.'); });

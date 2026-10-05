// La API es privada: aceptar envoltorios habituales sin inventar campos ausentes.
export function collection(raw, keys = []) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  for (const key of [...keys, 'elements', 'content', 'data', 'result']) {
    if (Array.isArray(raw[key])) return raw[key];
    if (raw[key] && typeof raw[key] === 'object') {
      const nested = collection(raw[key], keys);
      if (nested.length) return nested;
    }
  }
  return [];
}
export function profileName(raw) {
  const user = raw?.user || raw?.data || raw || {};
  return user.managerName || user.nickName || user.nickname || user.name || user.username || user.displayName || 'Tu cuenta Fantasy';
}
export function leagueId(row) { const id = row?.id ?? row?.leagueId ?? row?.league?.id; return /^[A-Za-z0-9_-]{1,80}$/.test(String(id ?? '')) ? String(id) : ''; }
export function leagueName(row) { return row?.name || row?.league?.name || `Liga ${leagueId(row) || 'desconocida'}`; }
export function standings(raw) { return collection(raw, ['standings', 'standing', 'teams', 'ranking']); }
export function teamId(row) { const id = row?.teamId ?? row?.team?.id ?? row?.id; return /^[A-Za-z0-9_-]{1,80}$/.test(String(id ?? '')) ? String(id) : ''; }
export function teamName(row) { return row?.team?.manager?.managerName || row?.team?.name || row?.manager?.managerName || row?.name || row?.teamName || row?.manager?.name || row?.user?.name || `Equipo ${teamId(row) || 'sin nombre'}`; }
export function teamPoints(row) { return row?.points ?? row?.team?.teamPoints ?? row?.team?.points ?? row?.totalPoints ?? row?.score ?? '—'; }
export function teamValue(row) { return playerValue({value:row?.teamValue ?? row?.team?.teamValue ?? row?.value}); }
export function isMyTeam(row, userId) { return row?.isMyTeam || row?.myTeam || (userId != null && String(row?.team?.manager?.id ?? row?.owner?.id ?? row?.userId ?? '') === String(userId)); }
export function players(raw) {
  const source = raw?.team || raw?.data?.team || raw;
  return collection(source, ['players', 'playerTeams', 'playerTeam', 'squad', 'lineup']);
}
export function playerName(row) {
  const player = row?.player || row?.playerMaster || row || {};
  return player.nickname || player.nickName || player.name || player.displayName || player.fullName || 'Jugador sin nombre';
}
export function playerValue(row) {
  const amount = row?.marketValue ?? row?.value ?? row?.player?.marketValue ?? row?.player?.value ?? row?.playerMaster?.marketValue;
  const numeric = Number(amount);
  return amount == null || !Number.isFinite(numeric) ? '—' : `${new Intl.NumberFormat('es-ES', {maximumFractionDigits: 2}).format(numeric)} €`;
}
export function playerPosition(row) {
  const player = row?.playerMaster || row?.player || row || {};
  return ({1:'POR',2:'DEF',3:'MED',4:'DEL',5:'ENT'})[player.positionId] || player.position?.name || player.position || '—';
}
export function playerClause(row) { return playerValue({value:row?.buyoutClause ?? row?.clause}); }
export function marketPrice(row) { return playerValue({value:row?.salePrice ?? row?.price ?? row?.amount}); }

import {collection,playerName,playerPosition} from './view-model.js';
export const numeric = value => value == null || value === '' || typeof value === 'boolean' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export function money(value, signed=false) {
  const n=numeric(value); if(n==null)return '—';
  const abs=Math.abs(n),unit=abs>=1e6?'M€':abs>=1000?'k€':'€',scale=abs>=1e6?1e6:abs>=1000?1000:1;
  return `${signed&&n>0?'+':n<0?'−':''}${new Intl.NumberFormat('es-ES',{maximumFractionDigits:unit==='M€'?2:unit==='k€'?1:0}).format(abs/scale)} ${unit}`;
}
export function safeImage(value) {try {const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}}
function image(pm) {
  if(safeImage(pm.image))return safeImage(pm.image);
  for(const key of ['transparent','player','beat']){const raw=pm.images?.[key];const value=typeof raw==='string'?raw:raw?.['256x256']||Object.values(raw||{})[0];if(safeImage(value))return safeImage(value);}
  return null;
}
export function normalizePlayer(row, clubs=new Map(), owner=null) {
  const pm=row?.playerMaster||row?.player||row||{},club=pm.team||clubs.get(String(pm.teamId))||{};
  const pid=pm.id??row?.playerMasterId??row?.playerId;
  return {id:pid==null?'':String(pid),name:playerName(row),pos:playerPosition(row),club:club.name||club.shortName||'',clubId:String(club.id??pm.teamId??''),badge:safeImage(club.badgeColor),image:image(pm),
    value:numeric(pm.marketValue??row?.marketValue),points:numeric(pm.points),average:numeric(pm.averagePoints),status:typeof pm.playerStatus==='string'?pm.playerStatus:null,
    price:numeric(row?.salePrice??row?.price),bids:numeric(row?.numberOfBids),clause:numeric(row?.buyoutClause??row?.clause),lock:row?.buyoutClauseLockedEndTime??row?.clauseLockUntil,
    owner,raw:row};
}
export function clauseState(player, now=Date.now()) {
  if(player.clause==null)return {known:false,open:false,hours:Infinity,label:'Sin datos'};
  if(player.lock==null||player.lock==='')return {known:true,open:true,hours:0,label:'Abierta'};
  const time=typeof player.lock==='number'?(player.lock<1e12?player.lock*1000:player.lock):Date.parse(player.lock);
  if(!Number.isFinite(time))return {known:false,open:false,hours:Infinity,label:'Fecha no disponible'};
  const hours=Math.max(0,(time-now)/3600000),label=hours===0?'Abierta':hours>=24?`En ${Math.floor(hours/24)} d ${Math.ceil(hours%24)} h`:`En ${Math.ceil(hours)} h`;
  return {known:true,open:hours===0,hours,label};
}
export function today() {return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());}
export function daysBefore(day,days) {const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-days);return date.toISOString().slice(0,10);}
export function saveSnapshot(history, snapshot) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date))return history;
  const filtered=history.filter(x=>x.date!==snapshot.date);
  return [...filtered,snapshot].sort((a,b)=>a.date.localeCompare(b.date)).slice(-120);
}
export function historySeries(history,pid=null,field='club') {
  return history.map(row=>({date:row.date,value:numeric(pid?row.players?.[pid]:row[field])})).filter(x=>x.value!=null);
}
export function delta(history, value, back, pid=null, field='club', day=today()) {
  const target=daysBefore(day,back),record=history.find(x=>x.date===target),old=numeric(pid?record?.players?.[pid]:record?.[field]);
  return numeric(value)!=null&&old!=null?value-old:null;
}
export function projection(series, current) {
  const rows=series.slice(-14);if(rows.length<7||numeric(current)==null)return null;
  const first=Date.parse(rows[0].date+'T12:00:00Z'),last=Date.parse(rows.at(-1).date+'T12:00:00Z');
  if((last-first)/86400000<7)return null;
  const data=rows.map(p=>({x:(Date.parse(p.date+'T12:00:00Z')-first)/86400000,y:p.value})),mx=data.reduce((s,p)=>s+p.x,0)/data.length,my=data.reduce((s,p)=>s+p.y,0)/data.length;
  const denominator=data.reduce((s,p)=>s+(p.x-mx)**2,0);if(!denominator)return null;
  const slope=data.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/denominator;
  return {seven:Math.max(0,current+slope*7),fourteen:Math.max(0,current+slope*14),days:Math.round((last-first)/86400000),samples:rows.length};
}
export function priceHistory(raw) {
  const source=raw?.playerMaster||raw?.player||raw||{};
  const list=collection(raw?.marketValueHistory||source.marketValueHistory||raw?.marketValueEvolution||source.marketValueEvolution,['values']);
  return list.map(r=>({date:String(r.date||r.timestamp||'').slice(0,10),value:numeric(r.value??r.marketValue)})).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.value!=null).sort((a,b)=>a.date.localeCompare(b.date));
}
export function sortPlayers(list,key,history) {
  return [...list].sort((a,b)=>{
    if(key==='name')return a.name.localeCompare(b.name,'es');
    const va=key==='change'?delta(history,a.value,1,a.id):a[key],vb=key==='change'?delta(history,b.value,1,b.id):b[key];
    if(va==null)return vb==null?0:1;if(vb==null)return -1;
    return key==='clause'?va-vb:vb-va;
  });
}

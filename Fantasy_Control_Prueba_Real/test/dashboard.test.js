import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlayer,clauseState,saveSnapshot,delta,projection,safeImage} from '../public/dashboard-data.js';
import {upstreamPath} from '../src/worker.js';
test('normalizes nested players, clubs, real clauses and absent values',()=>{
 const p=normalizePlayer({playerMaster:{id:8,nickname:'Jugador',positionId:4,marketValue:1200000,points:0,teamId:2,images:{transparent:{'256x256':'https://example.com/player.png'}}},buyoutClause:2000000},new Map([['2',{id:2,name:'Club'}]]));
 assert.equal(p.pos,'DEL');assert.equal(p.club,'Club');assert.equal(p.points,0);assert.equal(p.clause,2000000);assert.equal(p.average,null);assert.equal(p.image,'https://example.com/player.png');assert.equal(safeImage('javascript:alert(1)'),null);
});
test('clauses respect locks and do not invent availability without a price',()=>{
 const now=Date.parse('2026-10-05T12:00:00Z');
 assert.equal(clauseState({clause:100,lock:'2026-10-06T12:00:00Z'},now).hours,24);
 assert.equal(clauseState({clause:100},now).open,true);assert.equal(clauseState({clause:null},now).known,false);
});
test('daily history replaces same-day observations and requires exact dates for changes',()=>{
 const history=saveSnapshot([{date:'2026-10-04',players:{8:100}}],{date:'2026-10-05',players:{8:110}});
 const replacement=saveSnapshot(history,{date:'2026-10-05',players:{8:115}});
 assert.equal(replacement.length,2);assert.equal(delta(replacement,115,1,'8','club','2026-10-05'),15);assert.equal(delta(replacement,115,7,'8','club','2026-10-05'),null);
 assert.equal(projection(history,110),null);
 const rows=Array.from({length:8},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,value:100+i*10}));
 assert.equal(projection(rows,170).seven,240);assert.equal(projection(rows.slice(1),170),null);
});
test('calendar routing retains the jornada query and new routes are precise',()=>{
 assert.equal(upstreamPath('/api/calendar/8'),'/v1/competition/1/calendar?weekNumber=8');
 assert.equal(upstreamPath('/api/players'),'/v1/competition/1/players');assert.equal(upstreamPath('/api/team/5/money'),'/v1/competition/1/teams/5/money');assert.equal(upstreamPath('/api/players/delete'),null);
});

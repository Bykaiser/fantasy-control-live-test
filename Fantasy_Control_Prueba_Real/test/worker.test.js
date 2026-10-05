import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { upstreamPath } from '../src/worker.js';
import { collection, standings, teamId, players, playerName } from '../public/view-model.js';

const base = 'https://fantasy-control-live-test.example.workers.dev';
const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature-value';

test('only specific read routes are forwarded', () => {
  assert.equal(upstreamPath('/api/leagues'), '/v1/competition/1/leagues');
  assert.equal(upstreamPath('/api/league/42/team/19'), '/v1/competition/1/leagues/42/teams/19');
  assert.equal(upstreamPath('/api/league/42/standing/8'), '/v1/competition/1/leagues/42/standing/8');
  assert.equal(upstreamPath('/api/league/42/market'), '/v1/competition/1/league/42/market');
  assert.equal(upstreamPath('/api/league/../team/19'), null);
  assert.equal(upstreamPath('/api/league/42/buyout/19/pay'), null);
});

test('proxy forwards one bearer request without exposing it in response', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, opts) => {
      assert.equal(String(url), 'https://fantasy-api.llt-services.com/api/v1/competition/1/leagues?x-lang=es');
      assert.equal(opts.headers.Authorization, token);
      assert.equal(opts.redirect, 'manual');
      return new Response(JSON.stringify({leagues:[{id:42,name:'Liga'}]}), {headers:{'Content-Type':'application/json'}});
    };
    const response = await worker.fetch(new Request(`${base}/api/leagues`, {headers:{Authorization:token,Origin:base}}), {});
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {leagues:[{id:42,name:'Liga'}]});
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  } finally { globalThis.fetch = original; }
});

test('rejects cross-site, missing bearer, and writes before upstream', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('upstream should not be called'); };
  try {
    const cross = await worker.fetch(new Request(`${base}/api/leagues`, {headers:{Authorization:token,Origin:'https://evil.example'}}), {});
    assert.equal(cross.status, 403);
    const unauth = await worker.fetch(new Request(`${base}/api/leagues`), {});
    assert.equal(unauth.status, 401);
    const write = await worker.fetch(new Request(`${base}/api/leagues`, {method:'POST'}), {});
    assert.equal(write.status, 405);
  } finally { globalThis.fetch = original; }
});

test('maps a league, ranking and nested player entries', () => {
  assert.equal(collection({data:{leagues:[{id:1}]}}, ['leagues']).length, 1);
  const ranking = standings({elements:[{team:{id:17,name:'ByKaiser00'},points:258}]});
  assert.equal(teamId(ranking[0]), '17');
  assert.equal(playerName(players({team:{players:[{player:{name:'Navarro'}}]}})[0]), 'Navarro');
});

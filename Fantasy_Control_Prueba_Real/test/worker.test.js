import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { upstreamPath } from '../src/worker.js';
import {accessTokenFromConfig} from '../public/session-token.js';
import { collection, standings, teamId, teamName, teamPoints, teamValue, isMyTeam, players, playerName, playerPosition, playerClause, marketPrice } from '../public/view-model.js';

const base = 'https://fantasy-control-live-test.example.workers.dev';
const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature-value';
const loginRequest = (body, origin=base) => new Request(`${base}/api/login`, {
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),
});
test('email login matches the phone script and returns only the access token', async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async (url,opts) => {
      assert.equal(String(url),'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2');
      assert.equal(opts.method,'POST');
      assert.equal(opts.body.get('grant_type'),'password');
      assert.equal(opts.body.get('username'),'example@example.com');
      assert.equal(opts.body.get('password'),'test-password');
      assert.equal(opts.body.get('redirect_uri'),'authredirect://com.lfp.laligafantasy');
      return Response.json({access_token:token.slice(7),refresh_token:'must-not-return',id_token:'must-not-return'});
    };
    const response=await worker.fetch(loginRequest({email:'example@example.com',password:'test-password'}),{});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{access_token:token.slice(7)});
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  } finally {globalThis.fetch=original;}
});
test('login blocks foreign origins and invalid credentials before contacting LaLiga', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Should not reach upstream');};
  try {
    assert.equal((await worker.fetch(loginRequest({email:'a@b.com',password:'x'},'https://elsewhere.example'),{})).status,403);
    assert.equal((await worker.fetch(loginRequest({email:'a@b.com',password:''}),{})).status,400);
    assert.equal((await worker.fetch(new Request(`${base}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{})).status,403);
  } finally {globalThis.fetch=original;}
});
test('login errors never echo upstream account details or passwords', async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>Response.json({error_description:'AADB2C90034: example@example.com test-password'}, {status:400});
    const response=await worker.fetch(loginRequest({email:'example@example.com',password:'test-password'}),{});
    assert.equal(response.status,401);
    const body=await response.text();
    assert.ok(body.includes('AADB2C90034'));
    assert.ok(!body.includes('example@example.com'));
    assert.ok(!body.includes('test-password'));
  } finally {globalThis.fetch=original;}
});
test('session import extracts only the access token and rejects refresh-only files', () => {
  assert.equal(accessTokenFromConfig(JSON.stringify({access_token:token.slice(7),refresh_token:'unused'})), token.slice(7));
  assert.throws(() => accessTokenFromConfig('{"refresh_token":"unused"}'));
  assert.throws(() => accessTokenFromConfig('{"access_token":"short"}'));
});

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
      assert.equal(opts.headers['x-app'], '2');
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

test('maps the fields used by the working phone script', () => {
  const ranking = {team:{id:17,manager:{id:8,managerName:'ByKaiser00'},teamPoints:258,teamValue:215280000}};
  assert.equal(teamName(ranking), 'ByKaiser00');
  assert.equal(teamPoints(ranking), 258);
  assert.equal(teamValue(ranking), '215.280.000 €');
  assert.equal(isMyTeam(ranking, 8), true);
  const entry = {playerMaster:{nickname:'Navarro',positionId:3,marketValue:20960000},buyoutClause:25152000};
  assert.equal(playerName(entry), 'Navarro');
  assert.equal(playerPosition(entry), 'MED');
  assert.equal(playerClause(entry), '25.152.000 €');
  assert.equal(marketPrice({salePrice:1470000}), '1.470.000 €');
});

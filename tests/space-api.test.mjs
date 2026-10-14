import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const temp = await mkdtemp(join(tmpdir(), 'tether-tests-'));
for (const route of ['space','voice']) await build({
  entryPoints:[`app/api/${route}/route.ts`], outfile:join(temp,`${route}.mjs`), bundle:true, platform:'node', format:'esm',
  plugins:[{name:'test-bindings',setup(build){build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env = globalThis.__tetherTestEnv;'}));}}]
});
let sqlite, objects, failDelete=false;
const env = {};
globalThis.__tetherTestEnv = env;
const space = await import(pathToFileURL(join(temp,'space.mjs')));
const voice = await import(pathToFileURL(join(temp,'voice.mjs')));
function statement(sql,params=[]){return {
  bind(...values){return statement(sql,values);},
  async first(){return sqlite.prepare(sql).get(...params)||null;},
  async run(){const result=sqlite.prepare(sql).run(...params);return {success:true,meta:{changes:Number(result.changes)}};},
  async all(){return {results:sqlite.prepare(sql).all(...params)};},
  sql,params
};}
beforeEach(async()=>{
  sqlite?.close();sqlite=new DatabaseSync(':memory:');
  sqlite.exec(await readFile('drizzle/0000_faulty_paper_doll.sql','utf8'));
  sqlite.exec(await readFile('drizzle/0001_voice_cleanup.sql','utf8'));
  objects=new Map();failDelete=false;
  env.DB={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>({results:sqlite.prepare(s.sql).all(...s.params)}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  env.BUCKET={async put(key,body){objects.set(key,new Uint8Array(await new Response(body).arrayBuffer()));},async get(key){const value=objects.get(key);return value?{body:value,size:value.length}:null;},async list({prefix}){return {objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false};},async delete(keys){if(failDelete)throw new Error('Simulated storage outage');for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}};
});
after(async()=>{sqlite?.close();await rm(temp,{recursive:true,force:true});});
const credential=()=>crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
async function post(body,token){const response=await space.POST(new Request('https://tether.test/api/space',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://leolunelove.github.io',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}));return {status:response.status,...await response.json()};}
async function get(token){const response=await space.GET(new Request('https://tether.test/api/space',{headers:{Authorization:`Bearer ${token}`}}));return response.json();}
async function pair(){const a=credential(),b=credential();const created=await post({action:'create',name:'A',credential:a});const joined=await post({action:'join',name:'B',invite:created.space.invite,credential:b});assert.equal(joined.status,200);return {a,b,id:created.space.id};}
async function upload(token,revision=0,bytes){const form=new FormData();form.set('audio',new Blob([bytes||new Uint8Array([0x1a,0x45,0xdf,0xa3,0,0,0,0])],{type:'audio/webm'}),'voice.webm');form.set('duration','3');form.set('revision',String(revision));const response=await voice.POST(new Request('https://tether.test/api/voice',{method:'POST',headers:{Authorization:`Bearer ${token}`,Origin:'https://leolunelove.github.io'},body:form}));return {status:response.status,...await response.json()};}

test('lost create/join responses are recoverable without a duplicate or third participant',async()=>{
 const a=credential(),b=credential();const first=await post({action:'create',name:'A',credential:a});const retry=await post({action:'create',name:'A',credential:a});assert.equal(first.space.id,retry.space.id);
 const invite=first.space.invite;const joined=await post({action:'join',name:'B',invite,credential:b});const resumed=await post({action:'resume',credential:b});assert.equal(resumed.space.id,joined.space.id);assert.equal(resumed.sessionToken,b);
 assert.equal((await post({action:'join',name:'B',invite,credential:b})).status,200);
 assert.equal((await post({action:'join',name:'C',invite,credential:credential()})).status,409);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM spaces').get().n,1);
});
test('concurrent create and join retries converge on one space',async()=>{
 const a=credential(),b=credential();const creates=await Promise.all([post({action:'create',name:'A',credential:a}),post({action:'create',name:'A',credential:a})]);assert.equal(creates[0].space.id,creates[1].space.id);
 const joins=await Promise.all([post({action:'join',name:'B',invite:creates[0].space.invite,credential:b}),post({action:'join',name:'B',invite:creates[0].space.invite,credential:b})]);assert.ok(joins.every(j=>j.status===200));
});
test('recovery rotates credentials and survives a lost restore response',async()=>{
 const {a,b,id}=await pair();const next=credential();assert.equal((await post({action:'recovery'},a)).recoveryCode,a);
 const restored=await post({action:'restore',code:a,credential:next});assert.equal(restored.space.id,id);assert.equal((await get(a)).space,null);assert.equal((await get(b)).space.id,id);
 assert.equal((await post({action:'restore',code:a,credential:next})).space.id,id);
 assert.equal((await post({action:'restore',code:a,credential:credential()})).status,409);
});
test('turn authorization and revisions prevent duplicate passes; broken audio can be skipped',async()=>{
 const {a,b}=await pair();assert.equal((await upload(b)).status,409);assert.equal((await upload(a)).status,200);assert.equal((await upload(a)).status,409);
 assert.equal((await upload(b,1)).status,409);assert.equal((await post({action:'skip',revision:0},b)).status,409);assert.equal((await post({action:'skip',revision:1},a)).status,409);
 assert.equal((await post({action:'skip',revision:1},b)).status,200);assert.equal((await upload(b,1)).status,200);assert.equal(objects.size,1);
});
test('simultaneous uploads commit only one turn',async()=>{const {a,b}=await pair();const results=await Promise.all([upload(a),upload(a)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await get(b)).space.revision,1);assert.equal(objects.size,1);});
test('invalid media signatures are rejected without moving the space',async()=>{const {a}=await pair();assert.equal((await upload(a,0,new Uint8Array([1,2,3,4]))).status,400);assert.equal((await get(a)).space.revision,0);assert.equal(objects.size,0);});
test('ending revokes both ends and deletes audio, including after a cleanup outage',async()=>{
 const {a,b}=await pair();await upload(a);failDelete=true;assert.equal((await post({action:'end'},b)).status,200);assert.equal((await get(a)).space,null);assert.equal((await get(b)).space,null);assert.equal(objects.size,1);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM voice_cleanup').get().n,1);
 failDelete=false;const another=await pair();await post({action:'end'},another.a);assert.equal(objects.size,0);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM voice_cleanup').get().n,0);
 assert.equal((await post({action:'restore',code:a,credential:credential()})).status,409);
});
test('untrusted origins, malformed JSON and oversized bodies are rejected',async()=>{
 const req=(body,origin='https://leolunelove.github.io')=>new Request('https://tether.test/api/space',{method:'POST',headers:{Origin:origin},body});
 assert.equal((await space.POST(req('{}','https://evil.test'))).status,403);
 assert.equal((await space.POST(req('{'))).status,400);
 assert.equal((await space.POST(req('x'.repeat(4097)))).status,413);
});
test('same-origin cookie access supports recovery and is cleared on end',async()=>{
 const response=await space.POST(new Request('https://tether.test/api/space',{method:'POST',headers:{Origin:'https://tether.test','Content-Type':'application/json'},body:JSON.stringify({action:'create',name:'Cookie test',credential:credential()})}));
 const cookie=response.headers.get('set-cookie').split(';')[0];const data=await response.json();assert.equal(data.sessionToken,undefined);
 const recovery=await space.POST(new Request('https://tether.test/api/space',{method:'POST',headers:{Origin:'https://tether.test',Cookie:cookie},body:JSON.stringify({action:'recovery'})}));assert.ok((await recovery.json()).recoveryCode);
 const ended=await space.POST(new Request('https://tether.test/api/space',{method:'POST',headers:{Origin:'https://tether.test',Cookie:cookie},body:JSON.stringify({action:'end'})}));assert.match(ended.headers.get('set-cookie'),/Max-Age=0/);
});
test('onboarding abuse limit uses the edge address and expires',async()=>{
 const create=()=>space.POST(new Request('https://tether.test/api/space',{method:'POST',headers:{Origin:'https://leolunelove.github.io','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify({action:'create',name:'Rate test',credential:credential()})}));
 for(let i=0;i<30;i++)assert.equal((await create()).status,200);
 assert.equal((await create()).status,429);sqlite.prepare('UPDATE action_limits SET expires_at = 0').run();assert.equal((await create()).status,200);
});
test('audio retrieval requires the current holder',async()=>{
 const {a,b}=await pair();await upload(a);
 const read=token=>voice.GET(new Request('https://tether.test/api/voice',{headers:token?{Authorization:`Bearer ${token}`}:{}}));
 assert.equal((await read()).status,401);assert.equal((await read(a)).status,403);assert.equal((await read(b)).status,200);
});

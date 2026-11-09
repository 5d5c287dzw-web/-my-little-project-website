import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as adminGet,onRequestPost as adminPost,onRequestPatch as adminPatch} from '../functions/api/admin/workspace.js';
import {onRequestGet as creatorGet,onRequestPost as creatorPost,onRequestPatch as creatorPatch} from '../functions/api/creator/workspace.js';
import {onRequestGet as shopGet} from '../functions/api/shop.js';
import {onRequestGet as authConfigGet} from '../functions/api/auth-config.js';
import {onRequestGet as accountStatusGet} from '../functions/api/account-status.js';
import {onRequest as privatePage} from '../functions/_middleware.js';

const origin='https://mylittleproject.co.uk';
const issuer='https://clerk.example.test';
const now=Math.floor(Date.now()/1000);
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='unit-key';jwk.alg='RS256';jwk.use='sig';
globalThis.fetch=async url=>{assert.equal(url,issuer+'/.well-known/jwks.json');return new Response(JSON.stringify({keys:[jwk]}));};
const b64=bytes=>Buffer.from(bytes).toString('base64url');
async function token(user,fva=[3,2]){
 const header=b64(JSON.stringify({alg:'RS256',typ:'JWT',kid:'unit-key'}));
 const payload=b64(JSON.stringify({iss:issuer,sub:user,sid:'sess_example',azp:origin,iat:now-20,exp:now+300,fva}));
 const message=header+'.'+payload;
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(message));
 return message+'.'+b64(signature);
}
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../database/003_portal_workspace.sql',import.meta.url),'utf8'));
db.exec("INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by) VALUES ('user_admin','admin',1,'test'),('user_creator_a','creator',1,'test'),('user_creator_b','creator',1,'test')");
const d1={
 prepare(sql){let params=[];return {bind(...values){params=values;return this;},async first(){return db.prepare(sql).get(...params)??null;},async all(){return {results:db.prepare(sql).all(...params)};},async run(){return db.prepare(sql).run(...params);}};},
 async batch(statements){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
};
const env={DB:d1,CLERK_ISSUER:issuer,CLERK_JWKS_URL:issuer+'/.well-known/jwks.json',CLERK_ALLOWED_ORIGINS:origin};
const request=(path,method='GET',session=null,body=null,cookie=false)=>new Request(origin+path,{method,headers:{...(session?{[cookie?'Cookie':'Authorization']:cookie?'__session='+session:'Bearer '+session}:{}),...(body?{'Content-Type':'application/json','Origin':origin}:{})},body:body?JSON.stringify(body):undefined});
const context=(path,method,session,body)=>({request:request(path,method,session,body),env});
const result=async response=>({status:response.status,body:await response.json()});

test('public sign-in config rejects a Clerk key from another issuer',async()=>{
 const production='https://clerk.mylittleproject.co.uk';
 const key='pk_live_'+Buffer.from('clerk.mylittleproject.co.uk$').toString('base64url');
 const configured={CLERK_PUBLISHABLE_KEY:key,CLERK_ISSUER:production,CLERK_JWKS_URL:production+'/.well-known/jwks.json',CLERK_ALLOWED_ORIGINS:origin};
 assert.equal((await result(await authConfigGet({env:configured}))).body.frontendApiOrigin,production);
 const mixed=await result(await authConfigGet({env:{...configured,CLERK_ISSUER:issuer,CLERK_JWKS_URL:issuer+'/.well-known/jwks.json'}}));
 assert.equal(mixed.status,503);
 assert.equal(mixed.body.error,'sign_in_not_configured');
});

test('account status verifies its own session and exposes only approved workspace access',async()=>{
 assert.equal((await result(await accountStatusGet(context('/api/account-status','GET')))).status,401);
 assert.equal((await result(await accountStatusGet(context('/api/account-status','GET','bad.token')))).status,401);
 const customer=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_customer'))));
 assert.deepEqual(customer.body,{authenticated:true,userId:'user_customer',workspace:null,adminSecondFactorRequired:false});
 const creator=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_creator_a'))));
 assert.equal(creator.body.workspace,'creator');
 const adminWithoutMfa=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_admin',[3,-1]))));
 assert.equal(adminWithoutMfa.body.workspace,null);
 assert.equal(adminWithoutMfa.body.adminSecondFactorRequired,true);
 const admin=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_admin'))));
 assert.equal(admin.body.workspace,'admin');
});

test('staff endpoints fail closed and require recent second factor for writes',async()=>{
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET')))).status,401);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET','bad.token')))).status,401);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',await token('user_creator_a'))))).status,403);
 assert.equal((await result(await adminGet({request:request('/api/admin/workspace'),env:{}}))).status,503);
 const noMfa=await token('user_admin',[3,-1]);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',noMfa)))).body.error,'second_factor_required');
 const record={type:'category',name:'Miniature Engineering',slug:'miniature-engineering',description:'Tiny mechanisms',sortOrder:40,active:true};
 assert.equal((await result(await adminPost(context('/api/admin/workspace','POST',noMfa,record)))).body.error,'second_factor_required');
 const admin=await token('user_admin');
 const created=await result(await adminPost(context('/api/admin/workspace','POST',admin,record)));
 assert.equal(created.status,200);assert.ok(created.body.id);
 const after=await result(await adminGet(context('/api/admin/workspace','GET',admin)));
 assert.ok(after.body.categories.some(c=>c.id===created.body.id));
 assert.ok(after.body.audit.some(a=>a.targetId===created.body.id));
});

test('only public preview fields leave the catalogue',async()=>{
 let publicResult=await result(await shopGet({request:request('/api/shop'),env}));
 assert.equal(publicResult.body.products.length,0);
 const admin=await token('user_admin');
 const product={type:'product',id:'LP-031',slug:'little-rc-buggy',title:'Little RC Buggy',categoryId:'cat-robotics',summary:'Family buggy build',description:'A solder-free project in development.',kitStage:'prototype',visibility:'preview',pricePence:2999,priceConfirmed:false,supplierStrategy:'drop_ship'};
 assert.equal((await result(await adminPatch(context('/api/admin/workspace','PATCH',admin,product)))).status,200);
 publicResult=await result(await shopGet({request:request('/api/shop?slug=little-rc-buggy'),env}));
 assert.equal(publicResult.body.products[0].title,'Little RC Buggy');
 assert.equal(publicResult.body.products[0].pricePence,null);
 assert.equal('supplierStrategy' in publicResult.body.products[0],false);
});

test('creator records stay within the verified owner and review flow',async()=>{
 const creatorA=await token('user_creator_a'),creatorB=await token('user_creator_b'),admin=await token('user_admin');
 const idea={type:'project',title:'Garden Weather Lab',categoryId:'cat-electronics',summary:'Build a weather station together and measure the garden each day.',concept:'A solder-free family build with a display, simple sensors, weather measurements and a clear guide to testing readings.'};
 const created=await result(await creatorPost(context('/api/creator/workspace','POST',creatorA,idea)));
 assert.equal(created.status,200);const projectId=created.body.id;
 const other=await result(await creatorGet(context('/api/creator/workspace','GET',creatorB)));
 assert.equal(other.body.projects.length,0);
 assert.equal((await result(await creatorPatch(context('/api/creator/workspace','PATCH',creatorB,{...idea,id:projectId})))).status,404);
 const note=await result(await creatorPost(context('/api/creator/workspace','POST',creatorA,{type:'resource',projectId,kind:'guide',title:'Build guide outline',notes:'Step by step connections',status:'draft'})));
 assert.equal(note.status,200);
 const submission=await result(await creatorPost(context('/api/creator/workspace','POST',creatorA,{type:'submit',id:projectId})));
 assert.equal(submission.body.status,'submitted');
 const awaiting=await result(await adminGet(context('/api/admin/workspace','GET',admin)));
 assert.ok(awaiting.body.submissionResources.some(r=>r.projectId===projectId&&r.title==='Build guide outline'));
 assert.equal((await result(await creatorPatch(context('/api/creator/workspace','PATCH',creatorA,{...idea,id:projectId})))).status,409);
 const reviewed=await result(await adminPost(context('/api/admin/workspace','POST',admin,{type:'review',id:projectId,decision:'changes_requested',feedback:'Please add the sensor mounting plan.'})));
 assert.equal(reviewed.body.status,'changes_requested');
 const own=await result(await creatorGet(context('/api/creator/workspace','GET',creatorA)));
 assert.match(own.body.projects[0].adminFeedback,/sensor mounting/);
 assert.equal((await result(await creatorPatch(context('/api/creator/workspace','PATCH',creatorA,{...idea,id:projectId})))).status,200);
});

test('page middleware blocks anonymous and wrong-role visitors',async()=>{
 const anonymous=await privatePage({request:request('/admin/'),env,next:()=>new Response('private page')});
 assert.equal(anonymous.status,302);assert.match(anonymous.headers.get('Location'),/\/account\//);
 const wrong=await privatePage({request:request('/admin/','GET',await token('user_creator_a'),null,true),env,next:()=>new Response('private page')});
 assert.equal(wrong.status,403);
 const allowed=await privatePage({request:request('/admin/','GET',await token('user_admin'),null,true),env,next:()=>new Response('private page')});
 assert.equal(allowed.status,200);assert.equal(await allowed.text(),'private page');
 assert.equal(allowed.headers.get('Cache-Control'),'private, no-store');
 const creator=await privatePage({request:request('/studio/','GET',await token('user_creator_a'),null,true),env,next:()=>new Response('creator page')});
 assert.equal(creator.status,200);assert.equal(await creator.text(),'creator page');
 assert.equal((await privatePage({request:request('/studio/','GET',await token('user_admin'),null,true),env,next:()=>new Response('creator page')})).status,403);
 assert.equal((await privatePage({request:request('/admin/','GET',await token('user_admin'),null,true),env:{},next:()=>new Response('private page')})).status,503);
});

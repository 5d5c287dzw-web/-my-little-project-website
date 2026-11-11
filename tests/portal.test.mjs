import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as adminGet,onRequestPost as adminPost,onRequestPatch as adminPatch} from '../functions/api/admin/workspace.js';
import {onRequestGet as creatorGet,onRequestPost as creatorPost,onRequestPatch as creatorPatch} from '../functions/api/creator/workspace.js';
import {onRequestGet as shopGet} from '../functions/api/shop.js';
import {onRequestGet as authConfigGet} from '../functions/api/auth-config.js';
import {onRequestGet as accountStatusGet} from '../functions/api/account-status.js';
import {onRequestGet as workshopGet,onRequestPost as workshopPost,onRequestPatch as workshopPatch} from '../functions/api/workshop.js';
import {onRequestGet as launchGet,onRequestPatch as launchPatch} from '../functions/api/admin/launch-readiness.js';
import {onRequestPost as bomPost,onRequestPatch as bomPatch,onRequestDelete as bomDelete} from '../functions/api/admin/bom.js';
import {onRequest as privatePage} from '../functions/_middleware.js';

const origin='https://mylittleproject.co.uk';
const issuer='https://clerk.example.test';
const accessIssuer='https://mlp-admin.cloudflareaccess.com';
const accessAudience='adminApplicationAudience';
const accessEmail='owner@example.test';
const now=Math.floor(Date.now()/1000);
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='unit-key';jwk.alg='RS256';jwk.use='sig';
const accessPair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const accessJwk=await crypto.subtle.exportKey('jwk',accessPair.publicKey);accessJwk.kid='access-key';accessJwk.alg='RS256';accessJwk.use='sig';
globalThis.fetch=async url=>{
 if(url===issuer+'/.well-known/jwks.json')return new Response(JSON.stringify({keys:[jwk]}));
 assert.equal(url,accessIssuer+'/cdn-cgi/access/certs');return new Response(JSON.stringify({keys:[accessJwk]}));
};
const b64=bytes=>Buffer.from(bytes).toString('base64url');
async function token(user,fva=[3,-1]){
 const header=b64(JSON.stringify({alg:'RS256',typ:'JWT',kid:'unit-key'}));
 const payload=b64(JSON.stringify({iss:issuer,sub:user,sid:'sess_example',azp:origin,iat:now-20,exp:now+300,fva}));
 const message=header+'.'+payload;
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(message));
 return message+'.'+b64(signature);
}
async function accessToken({email=accessEmail,aud=accessAudience,exp=now+300,type='app'}={}){
 const header=b64(JSON.stringify({alg:'RS256',typ:'JWT',kid:'access-key'}));
 const payload=b64(JSON.stringify({iss:accessIssuer,aud:[aud],email,iat:now-20,nbf:now-20,exp,type,sub:'access-owner'}));
 const message=header+'.'+payload;
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',accessPair.privateKey,new TextEncoder().encode(message));
 return message+'.'+b64(signature);
}
const adminProof=await accessToken();
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../database/003_portal_workspace.sql',import.meta.url),'utf8'));
db.exec("INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by) VALUES ('user_admin','admin',1,'test'),('user_admin_b','admin',1,'test'),('user_creator_a','creator',1,'test'),('user_creator_b','creator',1,'test')");
const d1={
 prepare(sql){let params=[];return {bind(...values){params=values;return this;},async first(){return db.prepare(sql).get(...params)??null;},async all(){return {results:db.prepare(sql).all(...params)};},async run(){return db.prepare(sql).run(...params);}};},
 async batch(statements){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
};
const env={DB:d1,CLERK_ISSUER:issuer,CLERK_JWKS_URL:issuer+'/.well-known/jwks.json',CLERK_ALLOWED_ORIGINS:origin,
 ADMIN_ACCESS_TEAM_DOMAIN:accessIssuer,ADMIN_ACCESS_AUD:accessAudience,ADMIN_ACCESS_EMAIL:accessEmail};
const request=(path,method='GET',session=null,body=null,cookie=false,proof=adminProof)=>new Request(origin+path,{method,headers:{...(session?{[cookie?'Cookie':'Authorization']:cookie?'__session='+session:'Bearer '+session}:{}),...(proof?{'Cf-Access-Jwt-Assertion':proof}:{}),...(body?{'Content-Type':'application/json','Origin':origin}:{})},body:body?JSON.stringify(body):undefined});
const context=(path,method,session,body,proof=adminProof)=>({request:request(path,method,session,body,false,proof),env});
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
 assert.deepEqual(customer.body,{authenticated:true,userId:'user_customer',assignedRole:null,workspace:null,adminSecondFactorRequired:false});
 const creator=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_creator_a'))));
 assert.equal(creator.body.assignedRole,'creator');assert.equal(creator.body.workspace,'creator');
 const adminWithoutAccess=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_admin'),null,null)));
 assert.equal(adminWithoutAccess.body.assignedRole,'admin');
 assert.equal(adminWithoutAccess.body.workspace,null);
 assert.equal(adminWithoutAccess.body.adminSecondFactorRequired,true);
 const admin=await result(await accountStatusGet(context('/api/account-status','GET',await token('user_admin'))));
 assert.equal(admin.body.workspace,'admin');
});

test('admin endpoints require both Clerk role and separately signed Access application proof',async()=>{
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET')))).status,401);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET','bad.token')))).status,401);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',await token('user_creator_a'))))).status,403);
 assert.equal((await result(await adminGet({request:request('/api/admin/workspace'),env:{}}))).status,503);
 const noMfa=await token('user_admin');
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',noMfa,null,null)))).body.error,'admin_verification_required');
 const record={type:'category',name:'Miniature Engineering',slug:'miniature-engineering',description:'Tiny mechanisms',sortOrder:40,active:true};
 assert.equal((await result(await adminPost(context('/api/admin/workspace','POST',noMfa,record,null)))).body.error,'admin_verification_required');
 const [accessHeader,,accessSignature]=adminProof.split('.');
 const tampered=accessHeader+'.'+b64(JSON.stringify({iss:accessIssuer,aud:[accessAudience],email:accessEmail,iat:now-20,exp:now+300,type:'app',sub:'tampered'}))+'.'+accessSignature;
 for(const proof of [await accessToken({email:'someone-else@example.test'}),await accessToken({aud:'anotherApplication'}),await accessToken({exp:now-1}),await accessToken({type:'org'}),tampered,'bad.token']){
  assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',noMfa,null,proof)))).status,403);
 }
 assert.equal((await result(await adminGet({request:request('/api/admin/workspace','GET',noMfa),env:{...env,ADMIN_ACCESS_AUD:''}}))).status,503);
 assert.equal((await result(await adminGet({request:request('/api/admin/workspace','GET',noMfa),env:{...env,ADMIN_ACCESS_AUD:'anotherApplication,'+accessAudience}}))).status,200);
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
 const linked={...product,repositoryUrl:'https://github.com/example/little-rc-buggy',documentationUrl:'https://github.com/example/little-rc-buggy/tree/main/docs',videoUrl:'https://www.youtube.com/watch?v=example123'};
 assert.equal((await result(await adminPatch(context('/api/admin/workspace','PATCH',admin,{...linked,videoUrl:'javascript:alert(1)'})))).body.error,'invalid_video_url');
 assert.equal((await result(await adminPatch(context('/api/admin/workspace','PATCH',admin,{...linked,repositoryUrl:'http://github.com/example/little-rc-buggy'})))).status,400);
 assert.equal((await result(await adminPatch(context('/api/admin/workspace','PATCH',admin,linked)))).status,200);
 const privateProduct=(await result(await adminGet(context('/api/admin/workspace','GET',admin)))).body.products.find(p=>p.id==='LP-031');
 assert.equal(privateProduct.repositoryUrl,linked.repositoryUrl);
 assert.equal(privateProduct.documentationUrl,linked.documentationUrl);
 assert.equal(privateProduct.videoUrl,linked.videoUrl);
 const workshopProduct=(await result(await workshopGet(context('/api/workshop','GET',admin,null,null)))).body.products.find(p=>p.id==='LP-031');
 assert.equal(workshopProduct.repositoryUrl,linked.repositoryUrl);
 assert.equal(workshopProduct.documentationUrl,linked.documentationUrl);
 assert.equal(workshopProduct.videoUrl,linked.videoUrl);
 assert.equal('supplierStrategy' in workshopProduct,false);
 assert.equal((await result(await adminPatch(context('/api/admin/workspace','PATCH',admin,product)))).status,200);
 assert.equal((await result(await workshopGet(context('/api/workshop','GET',admin,null,null)))).body.products.find(p=>p.id==='LP-031').repositoryUrl,linked.repositoryUrl);
 const newProduct=await result(await adminPost(context('/api/admin/workspace','POST',admin,{...linked,slug:'garden-weather-lab',title:'Garden Weather Lab',visibility:'hidden'})));
 assert.equal(newProduct.status,200);
 assert.equal((await result(await workshopGet(context('/api/workshop','GET',admin,null,null)))).body.products.find(p=>p.id===newProduct.body.id).videoUrl,linked.videoUrl);
 publicResult=await result(await shopGet({request:request('/api/shop?slug=little-rc-buggy'),env}));
 assert.equal(publicResult.body.products[0].title,'Little RC Buggy');
 assert.equal(publicResult.body.products[0].pricePence,null);
 assert.equal('supplierStrategy' in publicResult.body.products[0],false);
 assert.equal('repositoryUrl' in publicResult.body.products[0],false);
 assert.equal('documentationUrl' in publicResult.body.products[0],false);
 assert.equal('videoUrl' in publicResult.body.products[0],false);
});

test('private product BOM keeps sourced prices, availability and audit history out of public and customer views',async()=>{
 const owner=await token('user_admin'),creator=await token('user_creator_a');
 assert.equal((await result(await bomPost(context('/api/admin/bom','POST',creator,{productId:'LP-001',starter:true})))).status,403);
 assert.equal((await result(await bomPost(context('/api/admin/bom','POST',owner,{productId:'LP-001',starter:true},null)))).status,403);
 assert.equal((await result(await bomPost(context('/api/admin/bom','POST',owner,{productId:'LP-001',starter:true})))).status,200);
 const initial=(await result(await adminGet(context('/api/admin/workspace','GET',owner)))).body;
 const seeded=initial.bomItems.filter(x=>x.productId==='LP-001');
 assert.equal(seeded.length,6);
 assert.ok(seeded.every(x=>x.buyPricePence===null&&x.sourcingStatus==='research'));
 const part={productId:'LP-001',partName:'Hook-up lead set',manufacturer:'Example',manufacturerPartNumber:'LEAD-10',supplierName:'RS',supplierPartNumber:'123-456',supplierUrl:'https://uk.rs-online.com/example',kitRole:'core',quantityPerKit:3,packQuantity:10,buyPricePence:499,priceEvidence:'listing',evidenceNote:'Exact ten-pack with matching female ends',checkedAt:new Date().toISOString().slice(0,10),availability:'in_stock',leadTimeDays:2,sourcingStatus:'candidate',productRevision:'A',notes:'Confirm pinout during assembly',sortOrder:65};
 assert.equal((await result(await bomPost(context('/api/admin/bom','POST',owner,{...part,supplierUrl:'http://example.test'})))).body.error,'invalid_supplier_url');
 assert.equal((await result(await bomPost(context('/api/admin/bom','POST',owner,{...part,checkedAt:''})))).body.error,'price_source_required');
 const created=await result(await bomPost(context('/api/admin/bom','POST',owner,part)));
 assert.equal(created.status,200);
 const edited=await result(await bomPatch(context('/api/admin/bom','PATCH',owner,{...part,id:created.body.id,buyPricePence:450,sourcingStatus:'tested'})));
 assert.equal(edited.status,200);
 const privateData=(await result(await adminGet(context('/api/admin/workspace','GET',owner)))).body;
 const saved=privateData.bomItems.find(x=>x.id===created.body.id);
 assert.equal(saved.buyPricePence,450);assert.equal(saved.packQuantity,10);assert.equal(saved.quantityPerKit,3);assert.equal(saved.sourcingStatus,'tested');
 assert.ok(privateData.audit.some(x=>x.targetId==='LP-001:'+created.body.id));
 const publicData=(await result(await shopGet({request:request('/api/shop?slug=little-flight-radar'),env}))).body;
 const customerData=(await result(await workshopGet(context('/api/workshop','GET',owner,null,null)))).body;
 assert.equal('bomItems' in publicData,false);assert.equal('bomItems' in customerData,false);
 assert.ok(publicData.products.every(x=>!('buyPricePence' in x)));
 assert.equal('buyPricePence' in customerData.products.find(x=>x.id==='LP-001'),false);
 assert.equal((await result(await bomDelete(context('/api/admin/bom','DELETE',owner,{productId:'LP-001',id:created.body.id})))).status,200);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',owner)))).body.bomItems.some(x=>x.id===created.body.id),false);
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
 assert.equal((await result(await creatorPost(context('/api/creator/workspace','POST',creatorA,{type:'submit',id:projectId})))).status,409);
 assert.equal((await result(await creatorPatch(context('/api/creator/workspace','PATCH',creatorA,{type:'resource',id:note.body.id,projectId,kind:'guide',title:'Build guide outline',notes:'Added sensor mounting steps',status:'draft'})))).status,200);
 assert.equal((await result(await creatorGet(context('/api/creator/workspace','GET',creatorA)))).body.projects[0].status,'draft');
 assert.equal((await result(await creatorPost(context('/api/creator/workspace','POST',creatorA,{type:'submit',id:projectId})))).body.status,'submitted');
 assert.equal((await result(await adminPost(context('/api/admin/workspace','POST',admin,{type:'review',id:projectId,decision:'changes_requested',feedback:'Please explain the weatherproofing.'})))).status,200);
 assert.equal((await result(await creatorPatch(context('/api/creator/workspace','PATCH',creatorA,{...idea,id:projectId})))).status,200);
 assert.equal((await result(await creatorGet(context('/api/creator/workspace','GET',creatorA)))).body.projects[0].status,'draft');
});

test('Flight Radar checks need admin access and evidence before verification',async()=>{
 const owner=await token('user_admin');
 assert.equal((await result(await launchGet(context('/api/admin/launch-readiness','GET')))).status,401);
 assert.equal((await result(await launchGet(context('/api/admin/launch-readiness','GET',await token('user_creator_a'))))).status,403);
 assert.equal((await result(await launchGet(context('/api/admin/launch-readiness','GET',owner,null,null)))).status,403);
 const initial=await result(await launchGet(context('/api/admin/launch-readiness','GET',owner)));
 assert.equal(initial.body.checks.length,9);
 assert.ok(initial.body.checks.every(x=>x.status==='missing'));
 const item={productId:'LP-001',checkKey:'bom',status:'verified',evidenceNote:'A tested parts list with exact revisions and costs.'};
 assert.equal((await result(await launchPatch(context('/api/admin/launch-readiness','PATCH',owner,{...item,evidenceNote:''})))).body.error,'evidence_required');
 assert.equal((await result(await launchPatch(context('/api/admin/launch-readiness','PATCH',owner,{...item,evidenceUrl:'http://example.test/bom'})))).body.error,'invalid_evidence_url');
 assert.equal((await result(await launchPatch(context('/api/admin/launch-readiness','PATCH',owner,{...item,checkKey:'unknown'})))).status,400);
 assert.equal((await result(await launchPatch(context('/api/admin/launch-readiness','PATCH',owner,{...item,checkKey:'checkout'})))).body.error,'checkout_not_connected');
 assert.equal((await result(await launchPatch(context('/api/admin/launch-readiness','PATCH',owner,{...item,evidenceUrl:'https://example.test/bom',nextAction:'Repeat with a second kit.'})))).status,200);
 const after=await result(await launchGet(context('/api/admin/launch-readiness','GET',owner)));
 assert.equal(after.body.checks[0].status,'verified');
 assert.equal(after.body.checks[0].evidenceUrl,'https://example.test/bom');
 assert.ok((await result(await adminGet(context('/api/admin/workspace','GET',owner)))).body.audit.some(x=>x.targetId==='LP-001:bom'));
 const publicProduct=(await result(await shopGet({request:request('/api/shop?slug=little-flight-radar'),env}))).body.products[0];
 assert.equal(publicProduct?.evidenceNote,undefined);
});

test('Workshop preview saves only the signed-in owner’s demo stage markers',async()=>{
 assert.equal((await result(await workshopGet(context('/api/workshop','GET')))).status,401);
 assert.equal((await result(await workshopGet(context('/api/workshop','GET',await token('user_creator_a'))))).status,403);
 const owner=await token('user_admin'),otherOwner=await token('user_admin_b');
 assert.deepEqual((await result(await workshopGet({request:request('/api/workshop','GET',owner,null,true,null),env}))).body.projects,[]);
 assert.deepEqual((await result(await workshopGet(context('/api/workshop','GET',owner,null,null)))).body.projects,[]);
 assert.equal((await result(await workshopPost(context('/api/workshop','POST',owner,{projectId:'LP-999'},null)))).status,400);
 const radar=await result(await workshopPost(context('/api/workshop','POST',owner,{projectId:'LP-001'},null)));
 assert.equal(radar.status,200);assert.deepEqual(radar.body.project.completedStages,[]);
 assert.deepEqual((await result(await workshopPatch(context('/api/workshop','PATCH',owner,{projectId:'LP-001',stage:2,completed:true},null)))).body.project.completedStages,[2]);
 const started=await result(await workshopPost({request:request('/api/workshop','POST',owner,{projectId:'LP-031'},true,null),env}));
 assert.equal(started.status,200);assert.deepEqual(started.body.project.completedStages,[]);
 assert.equal((await result(await workshopPatch(context('/api/workshop','PATCH',owner,{projectId:'LP-031',stage:6,completed:true},null)))).status,400);
 const saved=await result(await workshopPatch({request:request('/api/workshop','PATCH',owner,{projectId:'LP-031',stage:1,completed:true},true,null),env}));
 assert.equal(saved.status,200);assert.deepEqual(saved.body.project.completedStages,[1]);
 const crossOrigin=new Request(origin+'/api/workshop',{method:'PATCH',headers:{Cookie:'__session='+owner,Origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify({projectId:'LP-031',stage:2,completed:true})});
 assert.equal((await result(await workshopPatch({request:crossOrigin,env}))).status,401);
 const noOrigin=new Request(origin+'/api/workshop',{method:'PATCH',headers:{Cookie:'__session='+owner,'Content-Type':'application/json'},body:JSON.stringify({projectId:'LP-031',stage:2,completed:true})});
 assert.equal((await result(await workshopPatch({request:noOrigin,env}))).body.error,'origin_not_allowed');
 const ownProjects=(await result(await workshopGet({request:request('/api/workshop','GET',owner,null,true,null),env}))).body.projects;
 assert.deepEqual(ownProjects.find(x=>x.projectId==='LP-031').completedStages,[1]);
 assert.deepEqual(ownProjects.find(x=>x.projectId==='LP-001').completedStages,[2]);
 assert.deepEqual((await result(await workshopGet(context('/api/workshop','GET',otherOwner,null,null)))).body.projects,[]);
 assert.equal((await result(await workshopPatch(context('/api/workshop','PATCH',otherOwner,{projectId:'LP-031',stage:1,completed:true},null)))).status,404);
 assert.equal((await result(await workshopPatch(context('/api/workshop','PATCH',owner,{projectId:'LP-031',stage:1,completed:false},null)))).body.project.completedStages.length,0);
 assert.equal((await result(await adminGet(context('/api/admin/workspace','GET',owner,null,null)))).status,403);
});

test('page middleware blocks anonymous and wrong-role visitors',async()=>{
 const anonymous=await privatePage({request:request('/admin/'),env,next:()=>new Response('private page')});
 assert.equal(anonymous.status,302);assert.match(anonymous.headers.get('Location'),/\/account\//);
 const wrong=await privatePage({request:request('/admin/','GET',await token('user_creator_a'),null,true),env,next:()=>new Response('private page')});
 assert.equal(wrong.status,403);
 const noAccess=await privatePage({request:request('/admin/','GET',await token('user_admin'),null,true,null),env,next:()=>new Response('private page')});
 assert.equal(noAccess.status,403);
 const allowed=await privatePage({request:request('/admin/','GET',await token('user_admin'),null,true),env,next:()=>new Response('private page')});
 assert.equal(allowed.status,200);assert.equal(await allowed.text(),'private page');
 assert.equal(allowed.headers.get('Cache-Control'),'private, no-store');
 const creator=await privatePage({request:request('/studio/','GET',await token('user_creator_a'),null,true),env,next:()=>new Response('creator page')});
 assert.equal(creator.status,200);assert.equal(await creator.text(),'creator page');
 assert.equal((await privatePage({request:request('/studio/','GET',await token('user_admin'),null,true),env,next:()=>new Response('creator page')})).status,403);
 assert.equal((await privatePage({request:request('/admin/','GET',await token('user_admin'),null,true),env:{},next:()=>new Response('private page')})).status,503);
 const workshopAnonymous=await privatePage({request:request('/workshop/projects/lp-031/'),env,next:()=>new Response('private page')});
 assert.equal(workshopAnonymous.status,302);assert.match(workshopAnonymous.headers.get('Location'),/next=%2Fworkshop%2F/);
 assert.equal((await privatePage({request:request('/workshop/','GET',await token('user_creator_a'),null,true,null),env,next:()=>new Response('private page')})).status,403);
 const workshopOwner=await privatePage({request:request('/workshop/','GET',await token('user_admin'),null,true,null),env,next:()=>new Response('private page')});
 assert.equal(workshopOwner.status,200);assert.equal(workshopOwner.headers.get('Cache-Control'),'private, no-store');
});

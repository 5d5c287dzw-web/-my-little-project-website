import {requireStaff,requireMutationRequest,staffJson,staffError,AccessError} from '../staff-auth.js';

// The first kit is deliberately scoped. Other products can use the same table
// once their own acceptance checks have been defined.
export const productId='LP-001';
export const checks=[
 {key:'bom',title:'Bill of materials',detail:'Part numbers, revisions, quantities, landed costs and alternates.',action:'Confirm the exact Flight Radar parts list and a repeatable total kit cost.'},
 {key:'prototype',title:'Repeatable prototype',detail:'A complete build with observed aircraft data and documented test results.',action:'Build and test Flight Radar end to end; record the result and any failures.'},
 {key:'guide',title:'Family build guide',detail:'Tested solder-free assembly, setup, troubleshooting and revision control.',action:'Draft and test the versioned family build guide with the actual kit parts.'},
 {key:'safety',title:'Safety and age review',detail:'Age guidance, supervision, power, enclosure, radio and UK product obligations.',action:'Complete the product-specific safety and age review before publishing claims.'},
 {key:'media',title:'Real photos and video',detail:'Photographs of the actual kit and an honest working demonstration.',action:'Photograph and film the tested prototype and its family build experience.'},
 {key:'price',title:'Cost and selling price',detail:'Margin, VAT/tax treatment, shipping and the under £40 core target.',action:'Cost the confirmed BOM and choose a viable core or clearly premium kit price.'},
 {key:'supply',title:'Supplier and fulfilment',detail:'Availability, lead time, stock or drop-ship decision, returns and replacements.',action:'Confirm suppliers and decide whether to hold stock or drop-ship this kit.'},
 {key:'support',title:'Workshop support',detail:'Versioned docs, Git links, video, revisions and help for the purchased kit.',action:'Connect tested docs and support resources to the Flight Radar Workshop journey.'},
 {key:'checkout',title:'Test order',detail:'Test-mode payment, order record, shipping and access without a live charge.',action:'Run a complete test-mode order after the kit and fulfilment are validated.'}
];
const schema=`CREATE TABLE IF NOT EXISTS product_launch_checks (
 product_id TEXT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
 check_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('missing','working','verified','blocked')),
 evidence_note TEXT NOT NULL DEFAULT '',evidence_url TEXT NOT NULL DEFAULT '',
 decision_note TEXT NOT NULL DEFAULT '',next_action TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(product_id,check_key))`;
const ensure=db=>db.prepare(schema).run();
const limited=(value,max)=>{
 if(typeof value!=='string'||value.trim().length>max)throw new AccessError('invalid_input',400);
 return value.trim();
};
const evidenceUrl=value=>{
 const raw=limited(value,500);
 if(!raw)return '';
 let parsed;try{parsed=new URL(raw);}catch{throw new AccessError('invalid_evidence_url',400);}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||/\s/.test(raw))throw new AccessError('invalid_evidence_url',400);
 return parsed.href;
};
function responseRows(rows){
 const recorded=new Map(rows.map(row=>[row.checkKey,row]));
 return checks.map(item=>({...item,...recorded.get(item.key),checkKey:item.key,status:recorded.get(item.key)?.status||'missing',evidenceNote:recorded.get(item.key)?.evidenceNote||'',evidenceUrl:recorded.get(item.key)?.evidenceUrl||'',decisionNote:recorded.get(item.key)?.decisionNote||'',nextAction:recorded.get(item.key)?.nextAction||'',updatedAt:recorded.get(item.key)?.updatedAt||null}));
}
export async function onRequestGet({request,env}){
 try{
  await requireStaff(request,env,'admin');await ensure(env.DB);
  const {results}=await env.DB.prepare('SELECT check_key AS checkKey,status,evidence_note AS evidenceNote,evidence_url AS evidenceUrl,decision_note AS decisionNote,next_action AS nextAction,updated_at AS updatedAt FROM product_launch_checks WHERE product_id=?').bind(productId).all();
  return staffJson({productId,checks:responseRows(results),checkoutEnabled:false});
 }catch(error){return staffError(error);}
}
export async function onRequestPatch({request,env}){
 try{
  const actor=await requireStaff(request,env,'admin');requireMutationRequest(request);
  const raw=await request.text();if(raw.length>4096)throw new AccessError('request_too_large',413);
  let body;try{body=JSON.parse(raw);}catch{throw new AccessError('invalid_json',400);}
  if(!body||Array.isArray(body)||typeof body!=='object'||body.productId!==productId||!checks.some(x=>x.key===body.checkKey))throw new AccessError('invalid_input',400);
  if(!['missing','working','verified','blocked'].includes(body.status))throw new AccessError('invalid_input',400);
  if(body.checkKey==='checkout'&&body.status==='verified')throw new AccessError('checkout_not_connected',409);
  const evidenceNote=limited(body.evidenceNote??'',1000),url=evidenceUrl(body.evidenceUrl??'');
  const decisionNote=limited(body.decisionNote??'',500),nextAction=limited(body.nextAction??'',500);
  if(body.status==='verified'&&evidenceNote.length<20)throw new AccessError('evidence_required',400);
  await ensure(env.DB);
  const exists=await env.DB.prepare('SELECT id FROM shop_products WHERE id=?').bind(productId).first();
  if(!exists)throw new AccessError('record_not_found',404);
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO product_launch_checks(product_id,check_key,status,evidence_note,evidence_url,decision_note,next_action)
    VALUES(?,?,?,?,?,?,?) ON CONFLICT(product_id,check_key) DO UPDATE SET
    status=excluded.status,evidence_note=excluded.evidence_note,evidence_url=excluded.evidence_url,
    decision_note=excluded.decision_note,next_action=excluded.next_action,updated_at=CURRENT_TIMESTAMP`).bind(productId,body.checkKey,body.status,evidenceNote,url,decisionNote,nextAction),
   env.DB.prepare('INSERT INTO staff_audit_events(id,actor_clerk_user_id,action,target_type,target_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor.userId,body.status,'launch_check',productId+':'+body.checkKey)
  ]);
  return staffJson({saved:true,productId,checkKey:body.checkKey,status:body.status});
 }catch(error){return staffError(error);}
}

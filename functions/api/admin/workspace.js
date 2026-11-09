import {requireStaff,requireMutationRequest,staffJson,staffError,AccessError} from "../staff-auth.js";

const enumValue=(value,allowed)=>allowed.includes(value)?value:null;
const string=(value,max,{required=false}={})=>{
 if(typeof value!=="string")throw new AccessError("invalid_input",400);
 const result=value.trim();
 if(result.length>max||(required&&!result))throw new AccessError("invalid_input",400);
 return result;
};
const slug=value=>{const v=string(value,80,{required:true}).toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))throw new AccessError("invalid_slug",400);return v;};
const number=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)throw new AccessError("invalid_input",400);return v;};
const optionalPrice=v=>v===null||v===""?null:number(v,0,1000000);
const choice=(v,allowed)=>{const result=enumValue(v,allowed);if(result===null)throw new AccessError("invalid_input",400);return result;};
const id=()=>crypto.randomUUID();
const audit=(db,actor,action,type,target)=>db.prepare("INSERT INTO staff_audit_events(id,actor_clerk_user_id,action,target_type,target_id) VALUES(?,?,?,?,?)").bind(id(),actor,action,type,target);

async function readBody(request){
 requireMutationRequest(request);
 const raw=await request.text();
 if(raw.length>32768)throw new AccessError("request_too_large",413);
 try{const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=="object")throw Error();return body;}
 catch{throw new AccessError("invalid_json",400);}
}

async function categoryId(db,value){
 if(value===null||value==="")return null;
 const category=await db.prepare("SELECT id FROM shop_categories WHERE id=? AND active=1").bind(string(value,80,{required:true})).first();
 if(!category)throw new AccessError("unknown_category",400);
 return category.id;
}

async function values(db,type,body){
 if(type==="category")return {
  name:string(body.name,80,{required:true}),slug:slug(body.slug),description:string(body.description??"",500),
  sortOrder:number(body.sortOrder??0,0,9999),active:body.active===true?1:body.active===false?0:(()=>{throw new AccessError("invalid_input",400)})()
 };
 if(type==="product"){
  const price=optionalPrice(body.pricePence??null);
  const confirmed=body.priceConfirmed===true?1:body.priceConfirmed===false?0:(()=>{throw new AccessError("invalid_input",400)})();
  if(confirmed && price===null)throw new AccessError("price_required",400);
  return {title:string(body.title,120,{required:true}),slug:slug(body.slug),categoryId:await categoryId(db,body.categoryId??null),
   summary:string(body.summary??"",260),description:string(body.description??"",4000),
   kitStage:choice(body.kitStage,["concept","prototype","testing","ready"]),visibility:choice(body.visibility,["hidden","preview"]),
   pricePence:price,priceConfirmed:confirmed,supplierStrategy:choice(body.supplierStrategy,["undecided","stock","drop_ship","hybrid"])};
 }
 if(type==="campaign")return {
  title:string(body.title,120,{required:true}),channel:choice(body.channel,["email","website","social","other"]),
  status:choice(body.status,["idea","draft","review","scheduled","complete"]),
  audience:string(body.audience??"",160),brief:string(body.brief??"",4000),
  scheduledFor:body.scheduledFor?string(body.scheduledFor,32):null
 };
 throw new AccessError("unknown_record_type",400);
}

const configs={
 category:{table:"shop_categories",cols:["name","slug","description","sort_order","active"],keys:["name","slug","description","sortOrder","active"]},
 product:{table:"shop_products",cols:["title","slug","category_id","summary","description","kit_stage","visibility","price_pence","price_confirmed","supplier_strategy"],keys:["title","slug","categoryId","summary","description","kitStage","visibility","pricePence","priceConfirmed","supplierStrategy"]},
 campaign:{table:"marketing_campaigns",cols:["title","channel","status","audience","brief","scheduled_for"],keys:["title","channel","status","audience","brief","scheduledFor"]}
};

async function saveRecord(db,actor,body,update){
 const type=choice(body.type,Object.keys(configs));
 const config=configs[type];
 const v=await values(db,type,body);
 const recordId=update?string(body.id,80,{required:true}):`${type.slice(0,3)}_${id()}`;
 const fixedSlugs={"LP-001":"little-flight-radar","LP-031":"little-rc-buggy","LP-036":"build-and-race-twin-pack"};
 if(type==="product"&&fixedSlugs[recordId]&&v.slug!==fixedSlugs[recordId])throw new AccessError("starter_slug_fixed",400);
 if(update){const exists=await db.prepare(`SELECT id FROM ${config.table} WHERE id=?`).bind(recordId).first();if(!exists)throw new AccessError("record_not_found",404);}
 const fields=config.keys.map(k=>v[k]);
 const write=update
  ?db.prepare(`UPDATE ${config.table} SET ${config.cols.map(c=>c+"=?").join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...fields,recordId)
  :db.prepare(`INSERT INTO ${config.table}(id,${config.cols.join(",")}) VALUES(${Array(config.cols.length+1).fill("?").join(",")})`).bind(recordId,...fields);
 await db.batch([write,audit(db,actor,update?"update":"create",type,recordId)]);
 return {saved:true,type,id:recordId};
}

async function review(db,actor,body){
 const projectId=string(body.id,80,{required:true});
 const decision=choice(body.decision,["changes_requested","approved_internal"]);
 const feedback=string(body.feedback??"",2000,{required:decision==="changes_requested"});
 const project=await db.prepare("SELECT id,status FROM creator_projects WHERE id=?").bind(projectId).first();
 if(!project)throw new AccessError("record_not_found",404);
 if(project.status!=="submitted")throw new AccessError("not_submitted",409);
 await db.batch([
  db.prepare("UPDATE creator_projects SET status=?,admin_feedback=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='submitted'").bind(decision,feedback,projectId),
  audit(db,actor,decision,"creator_project",projectId)
 ]);
 return {saved:true,id:projectId,status:decision};
}

export async function onRequestGet({request,env}){
 try{
  await requireStaff(request,env,"admin");
  const [categories,products,campaigns,submissions,submissionResources,auditEvents]=await Promise.all([
   env.DB.prepare("SELECT id,slug,name,description,sort_order AS sortOrder,active,updated_at AS updatedAt FROM shop_categories ORDER BY sort_order,name LIMIT 200").all(),
   env.DB.prepare("SELECT id,slug,title,category_id AS categoryId,summary,description,kit_stage AS kitStage,visibility,price_pence AS pricePence,price_confirmed AS priceConfirmed,supplier_strategy AS supplierStrategy,updated_at AS updatedAt FROM shop_products ORDER BY updated_at DESC LIMIT 200").all(),
   env.DB.prepare("SELECT id,title,channel,status,audience,brief,scheduled_for AS scheduledFor,updated_at AS updatedAt FROM marketing_campaigns ORDER BY updated_at DESC LIMIT 100").all(),
   env.DB.prepare("SELECT id,owner_clerk_user_id AS creatorId,title,summary,concept,status,admin_feedback AS adminFeedback,updated_at AS updatedAt FROM creator_projects WHERE status IN ('submitted','changes_requested','approved_internal') ORDER BY updated_at DESC LIMIT 100").all(),
   env.DB.prepare("SELECT r.project_id AS projectId,r.kind,r.title,r.notes,r.status FROM creator_resources r JOIN creator_projects p ON p.id=r.project_id WHERE p.status IN ('submitted','changes_requested','approved_internal') ORDER BY r.updated_at DESC LIMIT 200").all(),
   env.DB.prepare("SELECT action,target_type AS targetType,target_id AS targetId,created_at AS createdAt FROM staff_audit_events ORDER BY created_at DESC LIMIT 20").all()
  ]);
  return staffJson({categories:categories.results,products:products.results,campaigns:campaigns.results,submissions:submissions.results,submissionResources:submissionResources.results,audit:auditEvents.results,liveOrders:false});
 }catch(error){return staffError(error);}
}

async function mutate({request,env},update){
 try{
  const actor=await requireStaff(request,env,"admin");
  const body=await readBody(request);
  const result=body.type==="review"?await review(env.DB,actor.userId,body):await saveRecord(env.DB,actor.userId,body,update);
  return staffJson(result);
 }catch(error){
  if(!(error instanceof AccessError)&&/UNIQUE constraint/i.test(String(error)))return staffJson({error:"duplicate_record"},409);
  return staffError(error);
 }
}
export const onRequestPost=context=>mutate(context,false);
export const onRequestPatch=context=>mutate(context,true);

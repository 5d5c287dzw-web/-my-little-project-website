import {requireWorkshopPreview,requireMutationRequest,staffJson,staffError,AccessError} from "./staff-auth.js";
import {ensureProductLinks,productLinkColumns} from "./product-links.js";

const stageCount=5;
const tables={
 'LP-031':{name:'workshop_preview_progress',schema:"CREATE TABLE IF NOT EXISTS workshop_preview_progress (clerk_user_id TEXT NOT NULL, project_id TEXT NOT NULL CHECK(project_id = 'LP-031'), completed_stages TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(clerk_user_id, project_id))"},
 'LP-001':{name:'workshop_radar_preview_progress',schema:"CREATE TABLE IF NOT EXISTS workshop_radar_preview_progress (clerk_user_id TEXT NOT NULL, project_id TEXT NOT NULL CHECK(project_id = 'LP-001'), completed_stages TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(clerk_user_id, project_id))"}
};
const tableFor=id=>tables[id]||null;

async function prepared(request,env){
 const actor=await requireWorkshopPreview(request,env,{allowCookie:true});
 // This tiny idempotent preview table can be provisioned by the first verified
 // owner request; no broad customer/purchase schema is installed in production.
 for(const table of Object.values(tables))await env.DB.prepare(table.schema).run();
 await ensureProductLinks(env.DB);
 return actor;
}
async function ownProgress(db,userId,projectId){
 const table=tableFor(projectId);
 const row=await db.prepare(`SELECT completed_stages AS completedStages, updated_at AS updatedAt FROM ${table.name} WHERE clerk_user_id=? AND project_id=?`).bind(userId,projectId).first();
 if(!row)return null;
 let stages;
 try{stages=JSON.parse(row.completedStages);}catch{throw new AccessError("progress_unavailable",503);}
 if(!Array.isArray(stages)||stages.some(x=>!Number.isInteger(x)||x<1||x>stageCount)||new Set(stages).size!==stages.length)throw new AccessError("progress_unavailable",503);
 return {projectId,completedStages:stages,updatedAt:row.updatedAt};
}
async function bodyOf(request){
 requireMutationRequest(request);
 const raw=await request.text();
 if(raw.length>1024)throw new AccessError("request_too_large",413);
 try{const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=="object")throw Error();return body;}
 catch{throw new AccessError("invalid_json",400);}
}
export async function onRequestGet({request,env}){
 try{
  const actor=await prepared(request,env);
  const [project,products]=await Promise.all([
   Promise.all(Object.keys(tables).map(id=>ownProgress(env.DB,actor.userId,id))),
   env.DB.prepare(`SELECT p.id,p.slug,p.title,p.summary,p.description,p.kit_stage AS kitStage,p.visibility,c.name AS categoryName,${productLinkColumns} FROM shop_products p LEFT JOIN shop_categories c ON c.id=p.category_id LEFT JOIN shop_product_links l ON l.product_id=p.id ORDER BY p.title LIMIT 200`).all()
  ]);
  return staffJson({projects:project.filter(Boolean),products:products.results,demoOnly:true});
 }catch(error){return staffError(error);}
}
export async function onRequestPost({request,env}){
 try{
  const actor=await requireWorkshopPreview(request,env,{allowCookie:true});
  const body=await bodyOf(request);
  const table=tableFor(body.projectId);if(!table)throw new AccessError("invalid_project",400);
  await env.DB.prepare(table.schema).run();
  await env.DB.prepare(`INSERT INTO ${table.name}(clerk_user_id,project_id) VALUES(?,?) ON CONFLICT(clerk_user_id,project_id) DO NOTHING`).bind(actor.userId,body.projectId).run();
  return staffJson({project:await ownProgress(env.DB,actor.userId,body.projectId),demoOnly:true});
 }catch(error){return staffError(error);}
}
export async function onRequestPatch({request,env}){
 try{
  const actor=await requireWorkshopPreview(request,env,{allowCookie:true});
  const body=await bodyOf(request);
  const table=tableFor(body.projectId);
  if(!table||!Number.isInteger(body.stage)||body.stage<1||body.stage>stageCount||typeof body.completed!=="boolean")throw new AccessError("invalid_stage",400);
  await env.DB.prepare(table.schema).run();
  const current=await ownProgress(env.DB,actor.userId,body.projectId);
  if(!current)throw new AccessError("project_not_in_workshop",404);
  const updated=new Set(current.completedStages);
  if(body.completed)updated.add(body.stage);else updated.delete(body.stage);
  const result=await env.DB.prepare(`UPDATE ${table.name} SET completed_stages=?,updated_at=CURRENT_TIMESTAMP WHERE clerk_user_id=? AND project_id=? AND completed_stages=?`).bind(JSON.stringify([...updated].sort((a,b)=>a-b)),actor.userId,body.projectId,JSON.stringify(current.completedStages)).run();
  if((result.meta?.changes??result.changes)===0)throw new AccessError("progress_changed_elsewhere",409);
  return staffJson({project:await ownProgress(env.DB,actor.userId,body.projectId),demoOnly:true});
 }catch(error){return staffError(error);}
}

import {requireWorkshopPreview,requireMutationRequest,staffJson,staffError,AccessError} from "./staff-auth.js";

const projectId="LP-031",stageCount=5;
const table="CREATE TABLE IF NOT EXISTS workshop_preview_progress (clerk_user_id TEXT NOT NULL, project_id TEXT NOT NULL CHECK(project_id = 'LP-031'), completed_stages TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(clerk_user_id, project_id))";

async function prepared(request,env){
 const actor=await requireWorkshopPreview(request,env,{allowCookie:true});
 // This tiny idempotent preview table can be provisioned by the first verified
 // owner request; no broad customer/purchase schema is installed in production.
 await env.DB.prepare(table).run();
 return actor;
}
async function ownProgress(db,userId){
 const row=await db.prepare("SELECT completed_stages AS completedStages, updated_at AS updatedAt FROM workshop_preview_progress WHERE clerk_user_id=? AND project_id=?").bind(userId,projectId).first();
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
  const project=await ownProgress(env.DB,actor.userId);
  return staffJson({projects:project?[project]:[],demoOnly:true});
 }catch(error){return staffError(error);}
}
export async function onRequestPost({request,env}){
 try{
  const actor=await requireWorkshopPreview(request,env,{allowCookie:true});
  const body=await bodyOf(request);
  if(body.projectId!==projectId)throw new AccessError("invalid_project",400);
  await env.DB.prepare(table).run();
  await env.DB.prepare("INSERT INTO workshop_preview_progress(clerk_user_id,project_id) VALUES(?,?) ON CONFLICT(clerk_user_id,project_id) DO NOTHING").bind(actor.userId,projectId).run();
  return staffJson({project:await ownProgress(env.DB,actor.userId),demoOnly:true});
 }catch(error){return staffError(error);}
}
export async function onRequestPatch({request,env}){
 try{
  const actor=await requireWorkshopPreview(request,env,{allowCookie:true});
  const body=await bodyOf(request);
  if(body.projectId!==projectId||!Number.isInteger(body.stage)||body.stage<1||body.stage>stageCount||typeof body.completed!=="boolean")throw new AccessError("invalid_stage",400);
  await env.DB.prepare(table).run();
  const current=await ownProgress(env.DB,actor.userId);
  if(!current)throw new AccessError("project_not_in_workshop",404);
  const updated=new Set(current.completedStages);
  if(body.completed)updated.add(body.stage);else updated.delete(body.stage);
  const result=await env.DB.prepare("UPDATE workshop_preview_progress SET completed_stages=?,updated_at=CURRENT_TIMESTAMP WHERE clerk_user_id=? AND project_id=? AND completed_stages=?").bind(JSON.stringify([...updated].sort((a,b)=>a-b)),actor.userId,projectId,JSON.stringify(current.completedStages)).run();
  if((result.meta?.changes??result.changes)===0)throw new AccessError("progress_changed_elsewhere",409);
  return staffJson({project:await ownProgress(env.DB,actor.userId),demoOnly:true});
 }catch(error){return staffError(error);}
}

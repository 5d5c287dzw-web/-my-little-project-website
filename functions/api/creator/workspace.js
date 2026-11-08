import {requireStaff,requireMutationRequest,staffJson,staffError,AccessError} from "../staff-auth.js";

const text=(v,max,required=false)=>{
 if(typeof v!=="string"||v.trim().length>max||(required&&!v.trim()))throw new AccessError("invalid_input",400);
 return v.trim();
};
const choice=(v,values)=>{if(!values.includes(v))throw new AccessError("invalid_input",400);return v;};
const uid=()=>crypto.randomUUID();
const audit=(db,actor,action,type,target)=>db.prepare("INSERT INTO staff_audit_events(id,actor_clerk_user_id,action,target_type,target_id) VALUES(?,?,?,?,?)").bind(uid(),actor,action,type,target);
async function bodyOf(request){
 requireMutationRequest(request);
 const raw=await request.text();
 if(raw.length>32768)throw new AccessError("request_too_large",413);
 try{const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=="object")throw Error();return body;}
 catch{throw new AccessError("invalid_json",400);}
}
async function ownProject(db,userId,id){
 const project=await db.prepare("SELECT id,status,summary,concept FROM creator_projects WHERE id=? AND owner_clerk_user_id=?").bind(text(id,80,true),userId).first();
 if(!project)throw new AccessError("project_not_found",404);
 return project;
}
async function editableProject(db,userId,id){
 const project=await ownProject(db,userId,id);
 if(!["draft","changes_requested"].includes(project.status))throw new AccessError("project_locked_for_review",409);
 return project;
}
async function category(db,id){
 if(id===null||id==="")return null;
 const row=await db.prepare("SELECT id FROM shop_categories WHERE id=? AND active=1").bind(text(id,80,true)).first();
 if(!row)throw new AccessError("unknown_category",400);
 return row.id;
}
async function projectFields(db,body){return {
 title:text(body.title,120,true),categoryId:await category(db,body.categoryId??null),
 summary:text(body.summary??"",500),concept:text(body.concept??"",5000)
};}
async function resourceFields(body){return {
 kind:choice(body.kind,["guide","video_plan","print_plan","bom_note"]),
 title:text(body.title,120,true),notes:text(body.notes??"",5000),
 status:choice(body.status,["draft","ready_for_review"])
};}

export async function onRequestGet({request,env}){
 try{
  const actor=await requireStaff(request,env,"creator");
  const [categories,projects,resources]=await Promise.all([
   env.DB.prepare("SELECT id,name FROM shop_categories WHERE active=1 ORDER BY sort_order,name").all(),
   env.DB.prepare("SELECT id,title,category_id AS categoryId,summary,concept,status,admin_feedback AS adminFeedback,created_at AS createdAt,updated_at AS updatedAt FROM creator_projects WHERE owner_clerk_user_id=? ORDER BY updated_at DESC LIMIT 100").bind(actor.userId).all(),
   env.DB.prepare("SELECT r.id,r.project_id AS projectId,r.kind,r.title,r.notes,r.status,r.updated_at AS updatedAt FROM creator_resources r JOIN creator_projects p ON p.id=r.project_id WHERE r.owner_clerk_user_id=? AND p.owner_clerk_user_id=? ORDER BY r.updated_at DESC LIMIT 200").bind(actor.userId,actor.userId).all()
  ]);
  return staffJson({categories:categories.results,projects:projects.results,resources:resources.results,marketplaceLive:false,royaltiesConnected:false});
 }catch(error){return staffError(error);}
}

async function mutate({request,env},update){
 try{
  const actor=await requireStaff(request,env,"creator");
  const body=await bodyOf(request), db=env.DB;
  if(body.type==="submit" && !update){
   const project=await editableProject(db,actor.userId,body.id);
   const resource=await db.prepare("SELECT id FROM creator_resources WHERE project_id=? AND owner_clerk_user_id=? AND kind IN ('guide','bom_note') LIMIT 1").bind(project.id,actor.userId).first();
   if(project.summary.length<20||project.concept.length<50||!resource)throw new AccessError("submission_incomplete",400);
   await db.batch([
    db.prepare("UPDATE creator_projects SET status='submitted',updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_clerk_user_id=?").bind(project.id,actor.userId),
    audit(db,actor.userId,"submit","creator_project",project.id)
   ]);
   return staffJson({saved:true,id:project.id,status:"submitted"});
  }
  if(body.type==="project"){
   const v=await projectFields(db,body);
   const projectId=update?text(body.id,80,true):`crp_${uid()}`;
   if(update)await editableProject(db,actor.userId,projectId);
   const write=update
    ?db.prepare("UPDATE creator_projects SET title=?,category_id=?,summary=?,concept=?,status='draft',updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_clerk_user_id=?").bind(v.title,v.categoryId,v.summary,v.concept,projectId,actor.userId)
    :db.prepare("INSERT INTO creator_projects(id,owner_clerk_user_id,title,category_id,summary,concept) VALUES(?,?,?,?,?,?)").bind(projectId,actor.userId,v.title,v.categoryId,v.summary,v.concept);
   await db.batch([write,audit(db,actor.userId,update?"update":"create","creator_project",projectId)]);
   return staffJson({saved:true,id:projectId});
  }
  if(body.type==="resource"){
   const v=await resourceFields(body);
   const resourceId=update?text(body.id,80,true):`crr_${uid()}`;
   const projectId=update
    ?(await db.prepare("SELECT project_id AS projectId FROM creator_resources WHERE id=? AND owner_clerk_user_id=?").bind(resourceId,actor.userId).first())?.projectId
    :text(body.projectId,80,true);
   if(!projectId)throw new AccessError("resource_not_found",404);
   await editableProject(db,actor.userId,projectId);
   const write=update
    ?db.prepare("UPDATE creator_resources SET kind=?,title=?,notes=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_clerk_user_id=? AND project_id=?").bind(v.kind,v.title,v.notes,v.status,resourceId,actor.userId,projectId)
    :db.prepare("INSERT INTO creator_resources(id,project_id,owner_clerk_user_id,kind,title,notes,status) VALUES(?,?,?,?,?,?,?)").bind(resourceId,projectId,actor.userId,v.kind,v.title,v.notes,v.status);
   await db.batch([write,audit(db,actor.userId,update?"update":"create","creator_resource",resourceId)]);
   return staffJson({saved:true,id:resourceId});
  }
  throw new AccessError("unknown_record_type",400);
 }catch(error){return staffError(error);}
}
export const onRequestPost=context=>mutate(context,false);
export const onRequestPatch=context=>mutate(context,true);

import {verifyClerkToken} from "./me.js";
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const steps={"LP-031":5,"LP-001":5};
async function handle({request,env},method){
 if(!env.DB)return reply({error:"database_not_configured"},503);
 const bearer=request.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer "))return reply({error:"authentication_required"},401);
 let claims;try{claims=await verifyClerkToken(bearer.slice(7),env,request)}catch{return reply({error:"invalid_session"},401)}
 try{
  const customer=await env.DB.prepare("SELECT id FROM workshop_customers WHERE clerk_user_id=?").bind(claims.sub).first();
  if(!customer)return reply({error:"customer_not_registered"},404);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS workshop_demo_builds (customer_id INTEGER NOT NULL, project_id TEXT NOT NULL, completed_steps TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(customer_id,project_id))").run();
  if(method==="GET"){
   const {results}=await env.DB.prepare("SELECT project_id,completed_steps,updated_at FROM workshop_demo_builds WHERE customer_id=? ORDER BY updated_at DESC").bind(customer.id).all();
   return reply({projects:results.map(r=>({projectId:r.project_id,completedSteps:JSON.parse(r.completed_steps),updatedAt:r.updated_at})),demoOnly:true});
  }
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.projectId!=="string"||!(body.projectId in steps))return reply({error:"invalid_project"},400);
  if(method==="POST"){
   await env.DB.prepare("INSERT INTO workshop_demo_builds(customer_id,project_id) VALUES(?,?) ON CONFLICT(customer_id,project_id) DO NOTHING").bind(customer.id,body.projectId).run();
  }else{
   if(!Array.isArray(body.completedSteps)||body.completedSteps.length>steps[body.projectId]||body.completedSteps.some(x=>!Number.isInteger(x)||x<0||x>=steps[body.projectId])||new Set(body.completedSteps).size!==body.completedSteps.length)return reply({error:"invalid_steps"},400);
   const existing=await env.DB.prepare("SELECT 1 FROM workshop_demo_builds WHERE customer_id=? AND project_id=?").bind(customer.id,body.projectId).first();
   if(!existing)return reply({error:"project_not_in_garage"},404);
   await env.DB.prepare("UPDATE workshop_demo_builds SET completed_steps=?,updated_at=CURRENT_TIMESTAMP WHERE customer_id=? AND project_id=?").bind(JSON.stringify(body.completedSteps.sort((a,b)=>a-b)),customer.id,body.projectId).run();
  }
  return reply({saved:true,projectId:body.projectId,demoOnly:true});
 }catch{return reply({error:"workshop_database_unavailable"},503)}
}
export const onRequestGet=c=>handle(c,"GET");
export const onRequestPost=c=>handle(c,"POST");
export const onRequestPut=c=>handle(c,"PUT");

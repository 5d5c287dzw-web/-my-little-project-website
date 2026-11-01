import {verifyClerkToken} from "./me.js";
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({request,env}){
 const auth=request.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer "))return respond({authorized:false,error:"authentication_required"},401);
 if(!env.DB)return respond({authorized:false,error:"admin_not_configured"},503);
 let claims;
 try{claims=await verifyClerkToken(auth.slice(7),env,request)}catch{return respond({authorized:false,error:"invalid_session"},401)}
 try{
  // Provision via trusted Cloudflare D1 console only. No public grants or registration endpoint.
  const row=await env.DB.prepare("SELECT role, enabled FROM staff_access WHERE clerk_user_id = ?").bind(claims.sub).first();
  if(!row||row.enabled!==1||row.role!=="admin")return respond({authorized:false,error:"access_denied"},403);
  return respond({authorized:true,role:"admin"});
 }catch{return respond({authorized:false,error:"admin_not_configured"},503)}
}

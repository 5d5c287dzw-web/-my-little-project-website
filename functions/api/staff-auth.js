import {verifyClerkToken} from "./me.js";
import {verifyAdminProof} from "./admin-proof.js";

export class AccessError extends Error { constructor(code,status){super(code);this.status=status;} }

function sessionCookie(request){
 const cookie=request.headers.get("Cookie")||"";
 const item=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("__session="));
 return item ? item.slice("__session=".length) : null;
}

async function verifiedUserId(request,env,allowCookie){
 const auth=request.headers.get("Authorization")||"";
 const token=auth.startsWith("Bearer ") ? auth.slice(7) : allowCookie ? sessionCookie(request) : null;
 if(!token)throw new AccessError("authentication_required",401);
 let claims;
 try{claims=await verifyClerkToken(token,env,request);}
 catch(e){
  const unavailable=["jwks_unavailable","auth_not_configured","invalid_auth_config","invalid_origins"].includes(e.message);
  throw new AccessError(unavailable?"authentication_unavailable":"invalid_session",unavailable?503:401);
 }
 return claims.sub;
}

export async function requireStaff(request,env,role,{allowCookie=false}={}){
 if(!env.DB)throw new AccessError("staff_database_unavailable",503);
 const userId=await verifiedUserId(request,env,allowCookie);
 let staff;
 try{staff=await env.DB.prepare("SELECT role,enabled FROM staff_access WHERE clerk_user_id=?").bind(userId).first();}
 catch{throw new AccessError("staff_access_not_configured",503);}
 if(!staff||staff.enabled!==1||staff.role!==role)throw new AccessError("access_denied",403);
 if(role==="admin"){
  try{await verifyAdminProof(request,env);}
  catch(e){
   const unavailable=["admin_access_not_configured","admin_verification_unavailable"].includes(e.message);
   throw new AccessError(unavailable?"admin_verification_unavailable":e.message==="admin_verification_required"?"admin_verification_required":"invalid_admin_verification",unavailable?503:403);
  }
 }
 return {userId,role:staff.role};
}

// The customer Workshop is an owner-only preview. It never grants Admin Desk
// access: Admin Desk requests still require their independent Access proof.
export async function requireWorkshopPreview(request,env,{allowCookie=false}={}){
 if(!env.DB)throw new AccessError("staff_database_unavailable",503);
 const userId=await verifiedUserId(request,env,allowCookie);
 let staff;
 try{staff=await env.DB.prepare("SELECT role,enabled FROM staff_access WHERE clerk_user_id=?").bind(userId).first();}
 catch{throw new AccessError("staff_access_not_configured",503);}
 if(!staff||staff.enabled!==1||staff.role!=="admin")throw new AccessError("access_denied",403);
 return {userId};
}

export function requireMutationRequest(request){
 const origin=request.headers.get("Origin");
 if(origin!==new URL(request.url).origin)throw new AccessError("origin_not_allowed",403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type")||""))throw new AccessError("json_required",415);
 const length=Number(request.headers.get("Content-Length")||0);
 if(length>32768)throw new AccessError("request_too_large",413);
}

export const staffJson=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Authorization, Cookie"}});
export function staffError(error){return staffJson({error:error instanceof AccessError?error.message:"temporarily_unavailable"},error instanceof AccessError?error.status:503);}

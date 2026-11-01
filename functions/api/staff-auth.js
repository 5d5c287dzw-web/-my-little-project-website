import {verifyClerkToken} from "./me.js";
export class AccessError extends Error {constructor(code,status){super(code);this.status=status;}}
export async function requireStaff(request,env,role){
 if(!env.DB)throw new AccessError("staff_database_unavailable",503);
 const auth=request.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer "))throw new AccessError("authentication_required",401);
 let claims;
 try{claims=await verifyClerkToken(auth.slice(7),env,request);}
 catch{throw new AccessError("invalid_session",401);}
 let staff;
 try{staff=await env.DB.prepare("SELECT role,enabled FROM staff_access WHERE clerk_user_id=?").bind(claims.sub).first();}
 catch{throw new AccessError("staff_access_not_configured",503);}
 if(!staff||staff.enabled!==1||staff.role!==role)throw new AccessError("access_denied",403);
 return {userId:claims.sub,role:staff.role};
}
export const staffJson=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Authorization"}});

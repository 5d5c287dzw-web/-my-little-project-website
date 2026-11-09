import {verifyClerkToken} from "./me.js";

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Authorization"}});

export async function onRequestGet({request,env}){
 if(!env.DB)return json({error:"temporarily_unavailable"},503);
 const authorization=request.headers.get("Authorization")||"";
 if(!authorization.startsWith("Bearer "))return json({error:"authentication_required"},401);
 let claims;
 try{claims=await verifyClerkToken(authorization.slice(7),env,request);}
 catch{return json({error:"invalid_session"},401);}
 let staff;
 try{staff=await env.DB.prepare("SELECT role,enabled FROM staff_access WHERE clerk_user_id=?").bind(claims.sub).first();}
 catch{return json({error:"temporarily_unavailable"},503);}
 const role=staff?.enabled===1&&["admin","creator"].includes(staff.role)?staff.role:null;
 const recentSecondFactor=Array.isArray(claims.fva)&&Number.isInteger(claims.fva[1])&&claims.fva[1]>=0&&claims.fva[1]<=720;
 return json({authenticated:true,userId:claims.sub,workspace:role==="creator"?"creator":role==="admin"&&recentSecondFactor?"admin":null,
              adminSecondFactorRequired:role==="admin"&&!recentSecondFactor});
}

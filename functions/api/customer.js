import {verifyClerkToken} from "./me.js";
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
// POST creates the signed-in user's own profile; GET reads it. No client-supplied user IDs.
async function handler({request,env},create){
 if(!env.DB)return reply({error:"database_not_configured"},503);
 const auth=request.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer "))return reply({error:"authentication_required"},401);
 let claims;
 try{claims=await verifyClerkToken(auth.slice(7),env,request);}
 catch{return reply({error:"invalid_session"},401);}
 try{
  if(create)await env.DB.prepare("INSERT INTO workshop_customers (clerk_user_id) VALUES (?) ON CONFLICT(clerk_user_id) DO NOTHING").bind(claims.sub).run();
  const customer=await env.DB.prepare("SELECT id, created_at FROM workshop_customers WHERE clerk_user_id = ?").bind(claims.sub).first();
  if(!customer)return reply({error:"customer_not_registered"},404);
  return reply({customer:{id:customer.id,createdAt:customer.created_at},projects:[],purchasesConnected:false});
 }catch{return reply({error:"customer_database_unavailable"},503);}
}
export const onRequestGet=context=>handler(context,false);
export const onRequestPost=context=>handler(context,true);

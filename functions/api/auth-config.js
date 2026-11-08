const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({env}){
 try{
  if(!env.CLERK_PUBLISHABLE_KEY||!env.CLERK_ISSUER||!env.CLERK_JWKS_URL||!env.CLERK_ALLOWED_ORIGINS)throw Error();
  const issuer=new URL(env.CLERK_ISSUER);
  if(issuer.protocol!=="https:"||!/^pk_(test|live)_/.test(env.CLERK_PUBLISHABLE_KEY))throw Error();
  return json({publishableKey:env.CLERK_PUBLISHABLE_KEY,frontendApiOrigin:issuer.origin});
 }catch{return json({error:"sign_in_not_configured"},503);}
}

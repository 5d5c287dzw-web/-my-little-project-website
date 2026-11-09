const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({env}){
 try{
  if(!env.CLERK_PUBLISHABLE_KEY||!env.CLERK_ISSUER||!env.CLERK_JWKS_URL||!env.CLERK_ALLOWED_ORIGINS)throw Error();
  const issuer=new URL(env.CLERK_ISSUER);
  const jwks=new URL(env.CLERK_JWKS_URL);
  const match=/^pk_(?:test|live)_([A-Za-z0-9_-]+)$/.exec(env.CLERK_PUBLISHABLE_KEY);
  if(!match||issuer.protocol!=="https:"||issuer.href!==issuer.origin+"/"||
     jwks.href!==issuer.origin+"/.well-known/jwks.json")throw Error();
  const encoded=match[1].replace(/-/g,"+").replace(/_/g,"/");
  const domain=atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,"="));
  if(!/^[a-z0-9.-]+\$$/i.test(domain)||"https://"+domain.slice(0,-1)!==issuer.origin)throw Error();
  return json({publishableKey:env.CLERK_PUBLISHABLE_KEY,frontendApiOrigin:issuer.origin});
 }catch{return json({error:"sign_in_not_configured"},503);}
}

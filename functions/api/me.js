// Clerk session JWT verification for Cloudflare Pages. Fail closed on missing config.
// CLERK_ISSUER must be the exact Clerk Frontend API issuer URL.
// CLERK_JWKS_URL must be the matching Clerk JWKS endpoint; configure both in Preview.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
function decodeBase64Url(s) {
 if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error("invalid_encoding");
 const binary=atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"="));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function decodeJSON(s){return JSON.parse(new TextDecoder().decode(decodeBase64Url(s)));}
async function verifyClerkToken(token,env,request){
 if(!env.CLERK_ISSUER||!env.CLERK_JWKS_URL||!env.CLERK_ALLOWED_ORIGINS)throw Error("auth_not_configured");
 const issuer=new URL(env.CLERK_ISSUER);
 const jwksUrl=new URL(env.CLERK_JWKS_URL);
 if(issuer.protocol!=="https:"||jwksUrl.protocol!=="https:"||issuer.origin!==jwksUrl.origin)throw Error("invalid_auth_config");
 const parts=token.split(".");
 if(parts.length!==3||token.length>12000)throw Error("invalid_token");
 const header=decodeJSON(parts[0]),claims=decodeJSON(parts[1]);
 if(header.alg!=="RS256"||(header.typ!==undefined&&header.typ!=="JWT")||typeof header.kid!=="string")throw Error("invalid_header");
 const allowed=env.CLERK_ALLOWED_ORIGINS.split(",").map(s=>s.trim()).filter(Boolean);
 if(!allowed.length||allowed.some(s=>{try{return new URL(s).origin!==s;}catch{return true;}}))throw Error("invalid_origins");
 const origin=request.headers.get("Origin");
 const azp=claims.azp;
 // Browser session tokens should be minted for an allowed frontend origin.
 if(typeof azp!=="string"||!allowed.includes(azp)||origin&&!allowed.includes(origin))throw Error("invalid_origin");
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!==issuer.origin||typeof claims.sub!=="string"||!claims.sub.startsWith("user_")||
    typeof claims.sid!=="string"||!claims.sid.startsWith("sess_")||
    !Number.isInteger(claims.exp)||claims.exp<=now||
    (claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30))||
    !Number.isInteger(claims.iat)||claims.iat>now+30)throw Error("invalid_claims");
 const response=await fetch(jwksUrl.toString(),{headers:{Accept:"application/json"}});
 if(!response.ok)throw Error("jwks_unavailable");
 const jwks=await response.json();
 const jwk=Array.isArray(jwks.keys)?jwks.keys.find(k=>k.kid===header.kid&&k.kty==="RSA"&&(k.use===undefined||k.use==="sig")&&(!k.alg||k.alg==="RS256")):null;
 if(!jwk)throw Error("unknown_signing_key");
 const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 const signed=new TextEncoder().encode(parts[0]+"."+parts[1]);
 if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decodeBase64Url(parts[2]),signed))throw Error("invalid_signature");
 return claims;
}
export async function onRequestGet({request,env}){
 if(!env.CLERK_ISSUER||!env.CLERK_JWKS_URL||!env.CLERK_ALLOWED_ORIGINS)return json({error:"authentication_not_configured"},503);
 const authorization=request.headers.get("Authorization")||"";
 if(!authorization.startsWith("Bearer "))return json({authenticated:false,error:"authentication_required"},401);
 try{
  const claims=await verifyClerkToken(authorization.slice(7),env,request);
  // No email or customer records are exposed until D1 ownership is wired.
  return json({authenticated:true,userId:claims.sub,customerDataConnected:false});
 }catch(e){
  if(e.message==="jwks_unavailable")return json({error:"authentication_temporarily_unavailable"},503);
  // Development-only diagnostic categories; never return tokens, claims, or key material.
  const categories={invalid_origin:"origin_not_allowed",invalid_origins:"origin_configuration_invalid",invalid_auth_config:"issuer_configuration_invalid",invalid_claims:"token_claims_rejected",invalid_header:"token_header_rejected",unknown_signing_key:"signing_key_not_found",invalid_signature:"signature_rejected"};
  return json({authenticated:false,error:"invalid_session",reason:categories[e.message]||"token_verification_failed"},401);
 }
}

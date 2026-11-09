// Verify the Cloudflare Access application token independently of Clerk.
// Only a protected Admin Desk application with independent MFA should issue it.
function decodeBase64Url(value){
 if(typeof value!=="string"||!value||!/^[A-Za-z0-9_-]+$/.test(value))throw Error("invalid_access_token");
 const binary=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
const decodeJSON=value=>JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));

export async function verifyAdminProof(request,env){
 const team=env.ADMIN_ACCESS_TEAM_DOMAIN,aud=env.ADMIN_ACCESS_AUD,email=env.ADMIN_ACCESS_EMAIL;
 if(typeof team!=="string"||typeof aud!=="string"||!aud||typeof email!=="string"||!email)throw Error("admin_access_not_configured");
 const audiences=aud.split(",").map(value=>value.trim());
 let url;
 try{url=new URL(team);}catch{throw Error("admin_access_not_configured");}
 if(url.protocol!=="https:"||url.origin!==team||url.port||!/^[-a-z0-9]+\.cloudflareaccess\.com$/i.test(url.hostname)||
    audiences.some(value=>!/^[a-zA-Z0-9]+$/.test(value))||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("admin_access_not_configured");
 const token=request.headers.get("Cf-Access-Jwt-Assertion");
 if(!token)throw Error("admin_verification_required");
 if(token.length>12000)throw Error("invalid_admin_verification");
 const parts=token.split(".");
 if(parts.length!==3)throw Error("invalid_admin_verification");
 let header,claims;
 try{header=decodeJSON(parts[0]);claims=decodeJSON(parts[1]);}
 catch{throw Error("invalid_admin_verification");}
 if(header.alg!=="RS256"||(header.typ!==undefined&&header.typ!=="JWT")||typeof header.kid!=="string"||!header.kid)
  throw Error("invalid_admin_verification");
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!==team||claims.type!=="app"||!Array.isArray(claims.aud)||!claims.aud.some(value=>audiences.includes(value))||
    typeof claims.email!=="string"||claims.email.toLowerCase()!==email.toLowerCase()||
    typeof claims.sub!=="string"||!claims.sub||!Number.isInteger(claims.exp)||claims.exp<=now||
    !Number.isInteger(claims.iat)||claims.iat>now+30||
    (claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30)))
  throw Error("invalid_admin_verification");
 let response;
 try{response=await fetch(team+"/cdn-cgi/access/certs",{headers:{Accept:"application/json"}});}
 catch{throw Error("admin_verification_unavailable");}
 if(!response.ok)throw Error("admin_verification_unavailable");
 let keys;
 try{keys=(await response.json()).keys;}catch{throw Error("admin_verification_unavailable");}
 const jwk=Array.isArray(keys)?keys.find(k=>k.kid===header.kid&&k.kty==="RSA"&&k.use==="sig"&&k.alg==="RS256"):null;
 if(!jwk)throw Error("invalid_admin_verification");
 try{
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decodeBase64Url(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!valid)throw Error("invalid_admin_verification");
 }catch{throw Error("invalid_admin_verification");}
 return claims;
}

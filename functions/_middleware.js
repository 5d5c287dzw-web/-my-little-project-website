import {requireStaff,requireWorkshopPreview,AccessError} from "./api/staff-auth.js";

// Root middleware runs before static files. _routes.json restricts its invocation
// to the private page paths and API paths, leaving the public shop static.
export async function onRequest({request,env,next}){
 const path=new URL(request.url).pathname;
 const role=path==="/admin"||path.startsWith("/admin/")?"admin":path==="/studio"||path.startsWith("/studio/")?"creator":path==="/workshop"||path.startsWith("/workshop/")?"workshop":null;
 if(!role)return next();
 try{
  if(role==="workshop")await requireWorkshopPreview(request,env,{allowCookie:true});
  else await requireStaff(request,env,role,{allowCookie:true});
  const response=await next();
  const headers=new Headers(response.headers);
  headers.set("Cache-Control","private, no-store");headers.set("X-Robots-Tag","noindex, nofollow");headers.set("Vary","Cookie");
  return new Response(response.body,{status:response.status,headers});
 }catch(error){
  if(error instanceof AccessError && error.status===401){
   const nextPath=role==="admin"?"%2Fadmin%2F":role==="creator"?"%2Fstudio%2F":"%2Fworkshop%2F";
   return Response.redirect(new URL("/account/?next="+nextPath,request.url),302);
  }
  const status=error instanceof AccessError?error.status:503;
  const message=status===403?(error.message==="admin_verification_required"?"Complete the separate Admin Desk security check to continue.":"This account is not approved for this workspace."):"This workspace is being configured. Please try again later.";
  return new Response(`<!doctype html><html lang="en-GB"><meta name="robots" content="noindex"><title>Workspace access</title><body style="font:16px Arial;padding:4rem;max-width:36rem"><h1>Workspace access</h1><p>${message}</p><p><a href="/account/">Account</a> · <a href="/">Shop home</a></p></body></html>`,{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
 }
}

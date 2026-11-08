async function loadClerk(){
 const response=await fetch('/api/auth-config',{cache:'no-store'});
 if(!response.ok)throw Error('not_configured');
 const config=await response.json();
 const origin=new URL(config.frontendApiOrigin);
 if(origin.protocol!=='https:'||!/^pk_(test|live)_/.test(config.publishableKey))throw Error('invalid_configuration');
 const script=(path,key)=>new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=origin.origin+path;element.crossOrigin='anonymous';if(key)element.setAttribute('data-clerk-publishable-key',key);element.onload=resolve;element.onerror=reject;document.head.append(element);});
 await script('/npm/@clerk/ui@1/dist/ui.browser.js');
 await script('/npm/@clerk/clerk-js@6/dist/clerk.browser.js',config.publishableKey);
 if(!window.Clerk||!window.__internal_ClerkUICtor)throw Error('sdk_unavailable');
 await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
 return window.Clerk;
}
window.addEventListener('load',async()=>{
 const status=document.getElementById('account-status');
 const root=document.getElementById('clerk-root');
 const candidate=new URLSearchParams(location.search).get('next');
 const next=['/admin/','/studio/'].includes(candidate)?candidate:'/';
 try{
  const clerk=await loadClerk();
  if(clerk.isSignedIn){
   status.textContent='Signed in. Choose where to go next.';
   document.getElementById('continue-link').href=next;
   document.getElementById('account-links').hidden=false;
   clerk.mountUserButton(root);
  }else{
   status.textContent='Use your email to sign in securely.';
   clerk.mountSignIn(root,{fallbackRedirectUrl:next});
  }
 }catch{
  status.textContent='Sign-in is being configured for this site. Your account and the shop remain safe; please try again later.';
 }
});

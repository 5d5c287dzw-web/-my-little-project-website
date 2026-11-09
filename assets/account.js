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
async function loadAccountStatus(clerk){
 const token=await clerk.session?.getToken();
 if(!token)throw Error('missing_session');
 const response=await fetch('/api/account-status',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
 if(!response.ok)throw Error('account_status_unavailable');
 const result=await response.json();
 if(result.authenticated!==true||result.userId!==clerk.user?.id)throw Error('account_mismatch');
 return result;
}
window.addEventListener('load',async()=>{
 const status=document.getElementById('account-status');
 const root=document.getElementById('clerk-root');
 const candidate=new URLSearchParams(location.search).get('next');
 const next=['/admin/','/studio/'].includes(candidate)?candidate:'/';
 try{
  const clerk=await loadClerk();
  if(clerk.isSignedIn){
   clerk.mountUserButton(root);
   try{
    const account=await loadAccountStatus(clerk);
    const target=account.workspace==='admin'?'/admin/':account.workspace==='creator'?'/studio/':'/';
    const destination=next==='/'?target:next===target?next:'/';
    const continueLink=document.getElementById('continue-link');
    continueLink.href=destination;
    continueLink.textContent=destination==='/'?'Continue to the shop →':'Continue to your workspace →';
    document.getElementById('admin-link').hidden=account.workspace!=='admin';
    document.getElementById('studio-link').hidden=account.workspace!=='creator';
    document.getElementById('account-user-id').textContent=account.userId;
    document.getElementById('account-identity').hidden=false;
    document.getElementById('account-links').hidden=false;
    status.textContent=account.adminSecondFactorRequired?'Signed in. Admin access needs an additional security check.':
     account.workspace?'Signed in securely. Your workspace is ready.':
     'Signed in securely. Workspace access is approved separately.';
   }catch{
    status.textContent='Signed in, but the shop could not verify workspace access. Please try again later.';
   }
  }else{
   status.textContent='Use your email to sign in securely.';
   clerk.mountSignIn(root,{fallbackRedirectUrl:next});
  }
 }catch{
  status.textContent='Sign-in is being configured for this site. Your account and the shop remain safe; please try again later.';
 }
});

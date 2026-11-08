const portalKind=document.body.dataset.portal;
const root=document.getElementById('portal');
const gate=document.getElementById('access-state');
const gateMessage=document.getElementById('access-message');
let data={};

const $=id=>document.getElementById(id);
const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
const label=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const date=value=>value?new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:value.replace(' ','T')+'Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const slugify=value=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const messages={second_factor_required:'For admin changes, verify a second factor on your account and sign in again. Your draft has not been saved.',access_denied:'Your account does not have access to this workspace.',staff_database_unavailable:'The private database is not connected yet.',staff_access_not_configured:'Staff access has not been configured yet.',authentication_required:'Sign in to continue.',invalid_session:'Your session needs refreshing. Sign in again.',duplicate_record:'That ID or URL slug is already in use.',starter_slug_fixed:'The URL for this original project is fixed because it already has a public page.',submission_incomplete:'Add a longer summary, a full concept and at least one guide or parts-list note before submitting.',project_locked_for_review:'This project is locked while it is under review.',not_submitted:'This project is no longer waiting for review.',invalid_input:'Check the form fields and try again.'};
function notice(message,error=false){const box=$('notice');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;box.scrollIntoView({block:'nearest',behavior:'smooth'});}
function errorMessage(error){return messages[error.message]||'The change could not be saved. Please try again.';}

async function loadClerk(){
 const response=await fetch('/api/auth-config',{cache:'no-store'});
 if(!response.ok)throw Error('sign_in_not_configured');
 const config=await response.json();
 const origin=new URL(config.frontendApiOrigin);
 if(origin.protocol!=='https:'||!/^pk_(test|live)_/.test(config.publishableKey))throw Error('sign_in_not_configured');
 const script=(path,key)=>new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=origin.origin+path;element.crossOrigin='anonymous';if(key)element.setAttribute('data-clerk-publishable-key',key);element.onload=resolve;element.onerror=reject;document.head.append(element);});
 await script('/npm/@clerk/ui@1/dist/ui.browser.js');
 await script('/npm/@clerk/clerk-js@6/dist/clerk.browser.js',config.publishableKey);
 if(!window.Clerk||!window.__internal_ClerkUICtor)throw Error('sign_in_unavailable');
 await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
 return window.Clerk;
}

async function api(method='GET',body){
 const token=await window.Clerk.session?.getToken();
 if(!token)throw Error('invalid_session');
 const response=await fetch(portalKind==='admin'?'/api/admin/workspace':'/api/creator/workspace',{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,cache:'no-store'
 });
 const payload=await response.json().catch(()=>({error:'temporarily_unavailable'}));
 if(!response.ok)throw Error(payload.error||'temporarily_unavailable');
 return payload;
}

const viewTitles={overview:'Overview',products:'Products',categories:'Categories',marketing:'Marketing',review:'Creator review',activity:'Activity',projects:'My projects',resources:'Guides & files',submissions:'Review status'};
function showView(name){
 if(!$('view-'+name))return;
 document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!=='view-'+name);
 document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===name));
 $('breadcrumb-view').textContent=viewTitles[name];
 const headings={overview:portalKind==='admin'?['Good evening, maker','The practical work of getting My Little Project ready for launch.']:['Make something worth sharing','Develop an idea, gather its build notes and send it for a thoughtful review.'],products:['Products','Shape the catalogue, one product at a time.'],categories:['Categories','Give every build a place to belong.'],marketing:['Marketing plans','Plan the launch story.'],review:['Creator review','Thoughtful decisions for new ideas.'],activity:['Activity','Recent changes across the workspaces.'],projects:['My projects','A home for your next idea.'],resources:['Guides & file plans','Bring the build experience into focus.'],submissions:['Review status','See where your projects stand.']};
 $('page-title').textContent=headings[name][0]+'.';$('page-subtitle').textContent=headings[name][1];
 history.replaceState(null,'','#'+name);
}
function bindNavigation(){
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
 document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.jump)));
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).hidden=true));
}
function empty(container,message){container.replaceChildren(node('div','empty',message));}
function row(title,subtitle,status,action,symbol='◇'){
 const button=node('button','record-row');button.type='button';
 button.append(node('span','record-symbol',symbol));
 const copy=node('span','record-copy');copy.append(node('strong','',title),node('small','',subtitle));button.append(copy);
 if(status)button.append(node('span','pill '+(/hidden|draft|concept|idea/i.test(status)?'grey':/submitted|review|testing|changes/i.test(status)?'amber':''),label(status)));
 button.append(node('span','row-arrow','→'));button.addEventListener('click',action);return button;
}
function activity(container,items){
 container.replaceChildren();if(!items?.length)return empty(container,'No changes recorded yet.');
 items.forEach(item=>{const wrapper=node('div','activity-row');wrapper.append(node('span','activity-icon','↗'));const copy=node('span');copy.append(node('span','',`${label(item.action)} · ${label(item.targetType)} · ${item.targetId}`),node('small','',date(item.createdAt)));wrapper.append(copy);container.append(wrapper);});
}
async function refresh(){data=await api();if(portalKind==='admin')renderAdmin();else renderCreator();$('top-status').textContent='Updated';}
function option(select,value,text){select.append(new Option(text,value));}
function formValue(form,name){return form.elements.namedItem(name).value;}
function setForm(form,values){Object.entries(values).forEach(([key,value])=>{const field=form.elements.namedItem(key);if(!field)return;if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value??'';});}

function fillCategories(select,selected=''){select.replaceChildren();option(select,'','Unassigned');data.categories.filter(c=>c.active||c.id===selected).forEach(c=>option(select,c.id,c.name));select.value=selected||'';}
function openAdminForm(type,record){
 const form=$(type+'-form');form.reset();form.hidden=false;
 const slugField=form.elements.namedItem('slug');if(slugField)delete slugField.dataset.manual;
 const id=record?.id||'';
 $(type+'-form-title').textContent=id?'Edit '+type:'New '+type;
 if(type==='product'){
  fillCategories(form.elements.namedItem('categoryId'),record?.categoryId);
  setForm(form,record?{...record,pricePounds:record.pricePence===null?'':(record.pricePence/100).toFixed(2),priceConfirmed:record.priceConfirmed===1}:{kitStage:'concept',visibility:'hidden',supplierStrategy:'undecided',priceConfirmed:false});
  form.elements.namedItem('slug').readOnly=Boolean(record&&['LP-001','LP-031','LP-036'].includes(record.id));
 }else if(type==='category')setForm(form,record?{...record,active:record.active===1}:{sortOrder:0,active:true});
 else setForm(form,record||{channel:'email',status:'idea'});
 form.elements.namedItem('id').value=id;
 form.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function renderAdmin(){
 $('metric-products').textContent=data.products.length;
 $('metric-categories').textContent=data.categories.filter(x=>x.active).length;
 $('metric-campaigns').textContent=data.campaigns.length;
 const waiting=data.submissions.filter(x=>x.status==='submitted').length;
 $('metric-review').textContent=waiting;$('review-count').textContent=waiting;
 activity($('activity-list'),data.audit);activity($('overview-activity'),data.audit.slice(0,4));
 const products=$('products-list');products.replaceChildren();
 if(!data.products.length)empty(products,'No product records yet. Add the first concept.');
 data.products.forEach(p=>products.append(row(p.title,`${p.id} · ${p.slug} · ${p.visibility==='preview'?'Public preview':'Internal only'}`,p.kitStage,()=>openAdminForm('product',p),'✳')));
 const cats=$('categories-list');cats.replaceChildren();if(!data.categories.length)empty(cats,'No categories yet.');
 data.categories.forEach(c=>cats.append(row(c.name,`${c.slug} · order ${c.sortOrder}`,c.active?'Active':'Inactive',()=>openAdminForm('category',c),'▦')));
 const campaigns=$('campaigns-list');campaigns.replaceChildren();if(!data.campaigns.length)empty(campaigns,'No plans yet. Start with a launch email idea.');
 data.campaigns.forEach(c=>campaigns.append(row(c.title,`${label(c.channel)} · ${c.audience||'Audience to decide'}`,c.status,()=>openAdminForm('campaign',c),'✉')));
 renderAdminSubmissions();
}
function renderAdminSubmissions(){
 const container=$('submissions-list');container.replaceChildren();
 if(!data.submissions.length)return empty(container,'No creator submissions yet.');
 data.submissions.forEach(p=>{
  const card=node('article','submission-card');card.append(node('span','eyebrow',`CREATOR PROJECT · ${date(p.updatedAt)}`),node('h3','',p.title),node('span','pill',label(p.status)),node('p','',p.summary||'No short summary.'));
  card.append(node('p','concept',p.concept||'No concept notes.'));
  const resources=data.submissionResources.filter(r=>r.projectId===p.id);
  if(resources.length){
   const notes=node('div','review-resources');notes.append(node('strong','','Build notes'));
   resources.forEach(r=>{const item=node('div','review-resource');item.append(node('span','eyebrow',`${label(r.kind)} · ${label(r.status)}`),node('b','',r.title),node('p','',r.notes||'No detail added yet.'));notes.append(item);});
   card.append(notes);
  }
  if(p.adminFeedback)card.append(node('p','feedback','Feedback: '+p.adminFeedback));
  if(p.status==='submitted'){
   const feedback=node('textarea','review-notes');feedback.maxLength=2000;feedback.placeholder='Feedback for the creator (required when requesting changes)';feedback.setAttribute('aria-label','Review feedback for '+p.title);
   const actions=node('div','actions');
   for(const [decision,text] of [['changes_requested','Request changes'],['approved_internal','Approve internally']]){
    const button=node('button','button '+(decision==='approved_internal'?'primary':'secondary'),text);button.type='button';
    button.addEventListener('click',async()=>{button.disabled=true;try{await api('POST',{type:'review',id:p.id,decision,feedback:feedback.value});await refresh();notice(`${p.title}: ${label(decision)} recorded.`);}catch(e){notice(errorMessage(e),true);}finally{button.disabled=false;}});actions.append(button);
   }card.append(feedback,actions);
  }container.append(card);
 });
}
function bindAdminForms(){
 for(const type of ['product','category','campaign']){
  $('new-'+type).addEventListener('click',()=>openAdminForm(type,null));
  const form=$(type+'-form');form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const id=formValue(form,'id');const payload={type,id};
   if(type==='product'){
    const price=formValue(form,'pricePounds');const amount=price===''?null:Number(price);
    if(amount!==null&&!Number.isFinite(amount))return notice('Enter a valid price.',true);
    Object.assign(payload,{title:formValue(form,'title'),slug:formValue(form,'slug'),categoryId:formValue(form,'categoryId')||null,summary:formValue(form,'summary'),description:formValue(form,'description'),kitStage:formValue(form,'kitStage'),visibility:formValue(form,'visibility'),pricePence:amount===null?null:Math.round(amount*100),priceConfirmed:form.elements.namedItem('priceConfirmed').checked,supplierStrategy:formValue(form,'supplierStrategy')});
   }else if(type==='category')Object.assign(payload,{name:formValue(form,'name'),slug:formValue(form,'slug'),description:formValue(form,'description'),sortOrder:Number(formValue(form,'sortOrder')),active:form.elements.namedItem('active').checked});
   else Object.assign(payload,{title:formValue(form,'title'),channel:formValue(form,'channel'),status:formValue(form,'status'),audience:formValue(form,'audience'),brief:formValue(form,'brief'),scheduledFor:formValue(form,'scheduledFor')||null});
   const button=form.querySelector('[type=submit]');button.disabled=true;
   try{await api(id?'PATCH':'POST',payload);form.hidden=true;await refresh();notice(`${label(type)} saved.`);}catch(e){notice(errorMessage(e),true);}finally{button.disabled=false;}
  });
  const nameField=form.elements.namedItem(type==='category'?'name':'title');const slugField=form.elements.namedItem('slug');
  if(slugField)nameField.addEventListener('input',()=>{if(!formValue(form,'id')&&!slugField.dataset.manual)slugField.value=slugify(nameField.value);});
  if(slugField)slugField.addEventListener('input',()=>{slugField.dataset.manual='1';});
 }
}

function editable(project){return ['draft','changes_requested'].includes(project.status);}
function fillCreatorCategories(select,selected=''){select.replaceChildren();option(select,'','Choose later');data.categories.forEach(c=>option(select,c.id,c.name));select.value=selected||'';}
function openCreatorForm(type,record){
 const form=$(type==='project'?'creator-project-form':'resource-form');form.reset();form.hidden=false;
 const id=record?.id||'';
 $(type==='project'?'creator-project-form-title':'resource-form-title').textContent=id?'Edit '+type:'New '+type;
 if(type==='project'){fillCreatorCategories(form.elements.namedItem('categoryId'),record?.categoryId);setForm(form,record||{});}
 else{
  const select=form.elements.namedItem('projectId');select.replaceChildren();data.projects.filter(editable).forEach(p=>option(select,p.id,p.title));
  setForm(form,record||{kind:'guide',status:'draft'});
  if(id)select.disabled=true;else select.disabled=false;
 }
 form.elements.namedItem('id').value=id;form.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function creatorCard(project){
 const card=node('article','submission-card');card.append(node('span','eyebrow',`UPDATED ${date(project.updatedAt)}`),node('h3','',project.title),node('span','pill',label(project.status)),node('p','',project.summary||'Add a short summary to help the team understand the idea.'));
 if(project.adminFeedback)card.append(node('p','feedback','Feedback: '+project.adminFeedback));
 const actions=node('div','actions');
 if(editable(project)){
  const edit=node('button','button secondary','Edit draft');edit.type='button';edit.addEventListener('click',()=>{showView('projects');openCreatorForm('project',project);});actions.append(edit);
  const submit=node('button','button primary','Submit for review →');submit.type='button';submit.addEventListener('click',async()=>{submit.disabled=true;try{await api('POST',{type:'submit',id:project.id});await refresh();notice(`${project.title} sent for review.`);}catch(e){notice(errorMessage(e),true);}finally{submit.disabled=false;}});actions.append(submit);
 }else actions.append(node('span','form-hint',project.status==='submitted'?'Under review; editing is paused.':'Internal approval recorded; further steps are agreed separately.'));
 card.append(actions);return card;
}
function renderCreator(){
 $('metric-projects').textContent=data.projects.length;
 $('metric-drafts').textContent=data.projects.filter(editable).length;
 $('metric-submitted').textContent=data.projects.filter(p=>p.status==='submitted').length;
 $('metric-resources').textContent=data.resources.length;
 const overview=$('overview-projects');overview.replaceChildren();if(!data.projects.length)empty(overview,'Your first project starts with a small idea.');
 data.projects.slice(0,4).forEach(p=>overview.append(row(p.title,p.summary||'Add a summary',p.status,()=>{showView('projects');if(editable(p))openCreatorForm('project',p);},'✳')));
 const projects=$('creator-projects-list');projects.replaceChildren();if(!data.projects.length)empty(projects,'No projects yet. Create your first draft.');
 data.projects.forEach(p=>projects.append(row(p.title,p.summary||'Add a summary',p.status,()=>editable(p)?openCreatorForm('project',p):showView('submissions'),'◇')));
 const resources=$('resources-list');resources.replaceChildren();if(!data.resources.length)empty(resources,'No build notes yet. Add a guide or parts-list plan.');
 data.resources.forEach(r=>resources.append(row(r.title,`${label(r.kind)} · ${data.projects.find(p=>p.id===r.projectId)?.title||'Project'}`,r.status,()=>{const project=data.projects.find(p=>p.id===r.projectId);if(project&&editable(project))openCreatorForm('resource',r);else notice('Resources are locked while the project is under review.',true);},'▤')));
 const submissions=$('creator-submissions-list');submissions.replaceChildren();if(!data.projects.length)empty(submissions,'No submissions yet. Start a draft and add a guide or parts-list note.');
 data.projects.forEach(p=>submissions.append(creatorCard(p)));
}
function bindCreatorForms(){
 $('new-creator-project').addEventListener('click',()=>openCreatorForm('project',null));
 $('new-resource').addEventListener('click',()=>{if(!data.projects.some(editable))return notice('Create an editable project first.',true);openCreatorForm('resource',null);});
 for(const [type,formId] of [['project','creator-project-form'],['resource','resource-form']]){
  const form=$(formId);form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const id=formValue(form,'id');const payload={type,id};
   if(type==='project')Object.assign(payload,{title:formValue(form,'title'),categoryId:formValue(form,'categoryId')||null,summary:formValue(form,'summary'),concept:formValue(form,'concept')});
   else Object.assign(payload,{projectId:formValue(form,'projectId'),kind:formValue(form,'kind'),title:formValue(form,'title'),notes:formValue(form,'notes'),status:formValue(form,'status')});
   const button=form.querySelector('[type=submit]');button.disabled=true;
   try{await api(id?'PATCH':'POST',payload);form.hidden=true;await refresh();notice(`${label(type)} saved.`);}catch(e){notice(errorMessage(e),true);}finally{button.disabled=false;}
  });
 }
}

window.addEventListener('load',async()=>{
 try{
  const clerk=await loadClerk();
  if(!clerk.isSignedIn){gateMessage.textContent='Sign in to continue. Access to this workspace also needs approval.';return;}
  await refresh();bindNavigation();if(portalKind==='admin')bindAdminForms();else bindCreatorForms();
  gate.hidden=true;root.hidden=false;
  const requested=location.hash.slice(1);if($('view-'+requested))showView(requested);
 }catch(error){
  gateMessage.textContent=error.message==='sign_in_not_configured'?'Sign-in is being configured for this site.':errorMessage(error);
 }
});

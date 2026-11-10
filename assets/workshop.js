const projectId='LP-031';
let project=null;
let products=[];
const status=document.getElementById('save-status');
const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};

async function workshopApi(method='GET',body){
 const response=await fetch('/api/workshop',{method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const result=await response.json().catch(()=>({error:'temporarily_unavailable'}));
 if(!response.ok)throw Error(result.error||'temporarily_unavailable');
 return result;
}
function render(){
 const reviewed=project?.completedStages||[],count=reviewed.length,percent=Math.round(count/5*100);
 document.querySelectorAll('[data-progress]').forEach(el=>el.textContent=percent+'%');
 document.querySelectorAll('[data-stage-count]').forEach(el=>el.textContent=count+' / 5');
 document.querySelectorAll('[data-count]').forEach(el=>el.textContent=count+' of 5 draft stages reviewed');
 document.querySelectorAll('[data-progress-bar]').forEach(el=>{el.value=count;el.textContent=count+' of 5';});
 document.querySelectorAll('[data-start-panel]').forEach(el=>el.hidden=Boolean(project));
 document.querySelectorAll('[data-project-card]').forEach(el=>el.hidden=!project);
 document.querySelectorAll('[data-empty-project]').forEach(el=>el.hidden=Boolean(project));
 document.querySelectorAll('.stage-toggle').forEach(button=>{
  const done=reviewed.includes(Number(button.dataset.stage));button.disabled=!project;
  button.setAttribute('aria-pressed',String(done));button.textContent=done?'Reviewed ✓ · undo':'Mark reviewed';
  button.closest('.stage-row')?.classList.toggle('reviewed',done);
 });
}
function renderResources(container,product){
 container.replaceChildren();
 for(const [field,label,description] of [
  ['repositoryUrl','Git repository','Source, design files and project history'],
  ['documentationUrl','Docs in Git','Build notes and project documentation'],
  ['videoUrl','YouTube video','Watch the project video']
 ]){
  const url=safeUrl(product?.[field]);
  const gitLink=field!=='videoUrl';
  const githubLink=Boolean(url&&gitLink&&['github.com','www.github.com'].includes(new URL(url).hostname.toLowerCase()));
  const item=node(url?'a':'div',url?'resource-link'+(githubLink?' github':''):'resource-link missing');
  const heading=node('div','resource-heading');
  if(githubLink){
   const mark=document.createElement('img');mark.src='/assets/github-mark.svg';mark.width=16;mark.height=16;mark.alt='';mark.setAttribute('aria-hidden','true');heading.append(mark);
  }else if(url&&gitLink){const symbol=node('span','git-symbol','⎇');symbol.setAttribute('aria-hidden','true');heading.append(symbol);}
  heading.append(node('strong','',label+(url?' ↗':'')));
  item.append(heading,node('span','',url?description+(githubLink?' · GitHub':''):'Not linked yet in Admin Desk'));
  if(url){item.href=url;item.target='_blank';item.rel='noopener noreferrer';item.referrerPolicy='no-referrer';}
  container.append(item);
 }
}
function renderProducts(){
 document.querySelectorAll('[data-product-links]').forEach(container=>renderResources(container,products.find(p=>p.id===container.dataset.productLinks)));
 const library=document.getElementById('workshop-products-list');
 if(library){
  library.replaceChildren();
  if(!products.length)library.append(node('p','','No product records have been added in Admin Desk yet.'));
  products.forEach(product=>{
   const card=node('article','product-library-card');
   card.append(node('span','pill',`${product.id} · ${product.kitStage} · ${product.visibility==='preview'?'PUBLIC PREVIEW':'INTERNAL'}`),node('h3','',product.title),node('p','',product.summary||'Description to be added.'));
   const count=['repositoryUrl','documentationUrl','videoUrl'].filter(key=>Boolean(product[key])).length;
   card.append(node('small','',`${count} of 3 resource links added`));
   const link=node('a','text-link','Open product resources →');link.href='/workshop/products/view/?id='+encodeURIComponent(product.id);card.append(link);library.append(card);
  });
 }
 const detail=document.getElementById('product-title');
 if(detail){
  const id=new URLSearchParams(location.search).get('id');
  const selected=products.find(p=>p.id===id);
  if(!selected){detail.textContent='Product not found';message('Choose a product from Products & docs.',true);return;}
  document.getElementById('product-id').textContent=selected.id+' · '+(selected.categoryName||'UNCATEGORISED');
  detail.textContent=selected.title;
  document.getElementById('product-summary').textContent=selected.summary||'Short description to be added.';
  document.getElementById('product-notes').textContent=selected.description||'Project notes to be added in Admin Desk.';
  document.getElementById('product-stage').textContent='Kit stage: '+selected.kitStage+' · '+(selected.visibility==='preview'?'Public coming-soon preview':'Internal concept');
  renderResources(document.getElementById('product-resource-links'),selected);
 }
}
async function refresh(){
 const result=await workshopApi();project=result.projects.find(x=>x.projectId===projectId)||null;products=result.products||[];render();renderProducts();
 if(document.body.dataset.workshopView==='products'){
  if(document.getElementById('product-title')?.textContent!=='Product not found')message('Resource links are maintained once per product in Admin Desk.');
 }else message(project?'Private demo progress is saved to your production account.':'The RC Buggy demo is ready to add to your private Workshop.');
}
document.querySelectorAll('.start-demo').forEach(button=>button.addEventListener('click',async()=>{
 button.disabled=true;
 try{const result=await workshopApi('POST',{projectId});project=result.project;render();message('RC Buggy demo added to your private Workshop.');}
 catch{message('Could not add the demo project. Please try again.',true);}
 finally{button.disabled=false;}
}));
document.querySelectorAll('.stage-toggle').forEach(button=>button.addEventListener('click',async()=>{
 if(!project)return;
 button.disabled=true;const stage=Number(button.dataset.stage),completed=!project.completedStages.includes(stage);
 try{const result=await workshopApi('PATCH',{projectId,stage,completed});project=result.project;render();message('Draft stage review saved.');}
 catch(error){if(error.message==='progress_changed_elsewhere')await refresh().catch(()=>{});message('That stage was not saved. Please retry.',true);}
 finally{button.disabled=!project;}
}));
const filters=[...document.querySelectorAll('[data-filter]')];
filters.forEach(button=>button.addEventListener('click',()=>{
 const kind=button.dataset.filter;filters.forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
 let count=0;document.querySelectorAll('.print-card').forEach(el=>{el.hidden=kind!=='all'&&el.dataset.kind!==kind;if(!el.hidden)count++;});
 document.getElementById('print-count').textContent=count+' concept part'+(count===1?'':'s')+' shown';
}));
refresh().catch(()=>message('Workshop data is temporarily unavailable. Your progress has not changed.',true));

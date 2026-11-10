const projectId='LP-031';
let project=null;
const status=document.getElementById('save-status');
const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};

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
async function refresh(){
 const result=await workshopApi();project=result.projects.find(x=>x.projectId===projectId)||null;render();
 message(project?'Private demo progress is saved to your production account.':'The RC Buggy demo is ready to add to your private Workshop.');
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

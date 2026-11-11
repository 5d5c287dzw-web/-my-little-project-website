const portalKind=document.body.dataset.portal;
const root=document.getElementById('portal');
const gate=document.getElementById('access-state');
const gateMessage=document.getElementById('access-message');
let data={};
let selectedProductId='';
const photoObjectUrls=new Set();

const $=id=>document.getElementById(id);
const node=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
const label=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const date=value=>value?new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:value.replace(' ','T')+'Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const timestamp=value=>new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:value.replace(' ','T')+'Z');
const slugify=value=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const messages={admin_verification_required:'Complete the separate Admin Desk security check and try again. Your draft has not been saved.',invalid_admin_verification:'The Admin Desk security check has expired. Open the admin page to renew it.',admin_verification_unavailable:'The Admin Desk security check is unavailable. Your draft has not been saved.',access_denied:'Your account does not have access to this workspace.',staff_database_unavailable:'The private database is not connected yet.',staff_access_not_configured:'Staff access has not been configured yet.',authentication_required:'Sign in to continue.',invalid_session:'Your session needs refreshing. Sign in again.',duplicate_record:'That ID or URL slug is already in use.',starter_slug_fixed:'The URL for this original project is fixed because it already has a public page.',submission_incomplete:'Add a longer summary, a full concept and at least one guide or parts-list note before submitting.',revision_required:'Update your project or a build note before submitting it again.',project_locked_for_review:'This project is locked while it is under review.',not_submitted:'This project is no longer waiting for review.',invalid_repository_url:'Enter an HTTPS Git repository URL without credentials.',invalid_documentation_url:'Enter an HTTPS link to the product documentation.',invalid_video_url:'Enter a YouTube HTTPS video URL.',invalid_evidence_url:'Use an HTTPS evidence link without credentials.',invalid_supplier_url:'Enter an HTTPS supplier URL without credentials.',invalid_checked_date:'Enter a valid date that is not in the future.',price_source_required:'A sourced price needs a supplier, check date and supplier link or specific source note.',invalid_image:'Choose a JPEG, PNG or WebP photograph.',invalid_image_size:'The photo could not be reduced enough. Try a smaller image.',record_not_found:'This part or product could not be found. Refresh and try again.',evidence_required:'Add a specific evidence note of at least 20 characters before marking this check verified.',checkout_not_connected:'A test order cannot be verified until test-mode checkout and order handling exist.',invalid_input:'Check the form fields and try again.'};
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
async function readinessApi(method='GET',body){
 const token=await window.Clerk.session?.getToken();
 if(!token)throw Error('invalid_session');
 const response=await fetch('/api/admin/launch-readiness',{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const payload=await response.json().catch(()=>({error:'temporarily_unavailable'}));
 if(!response.ok)throw Error(payload.error||'temporarily_unavailable');
 return payload;
}
async function bomApi(method,body){
 const token=await window.Clerk.session?.getToken();
 if(!token)throw Error('invalid_session');
 const response=await fetch('/api/admin/bom',{method,headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const payload=await response.json().catch(()=>({error:'temporarily_unavailable'}));
 if(!response.ok)throw Error(payload.error||'temporarily_unavailable');
 return payload;
}
async function mediaApi(method,body){
 const token=await window.Clerk.session?.getToken();
 if(!token)throw Error('invalid_session');
 const upload=body instanceof FormData;
 const response=await fetch('/api/admin/media',{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(upload?{}:{'Content-Type':'application/json'})},body:upload?body:JSON.stringify(body),cache:'no-store'});
 const payload=await response.json().catch(()=>({error:'temporarily_unavailable'}));
 if(!response.ok)throw Error(payload.error||'temporarily_unavailable');
 return payload;
}
function photoFor(type,id){return (data.media||[]).find(photo=>photo.targetType===type&&photo.targetId===id);}
async function privatePhoto(container,type,id,alt){
 const version=Symbol();container.photoVersion=version;
 container.replaceChildren(node('span','','Loading photograph…'));
 try{
  const token=await window.Clerk.session?.getToken();
  if(!token)throw Error();
  const response=await fetch('/api/admin/media?type='+encodeURIComponent(type)+'&id='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)throw Error();
  const objectUrl=URL.createObjectURL(await response.blob());
  if(!container.isConnected||container.photoVersion!==version){URL.revokeObjectURL(objectUrl);return;}
  photoObjectUrls.add(objectUrl);
  const image=node('img');image.src=objectUrl;image.alt=alt||'Product photograph';container.replaceChildren(image);
 }catch{if(container.isConnected&&container.photoVersion===version)container.replaceChildren(node('span','','Photo unavailable; try refreshing.'));}
}
async function compactPhoto(file){
 const source=URL.createObjectURL(file);
 let image;
 try{image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=source;});}
 catch{throw Error('invalid_image');}
 finally{URL.revokeObjectURL(source);}
 for(const maximum of [1200,1000,800,600]){
  const scale=Math.min(1,maximum/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.68,.54]){
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
   if(blob&&blob.size>=20&&blob.size<=400000)return new File([blob],'photo.jpg',{type:'image/jpeg'});
  }
 }
 throw Error('invalid_image_size');
}
async function uploadPhoto(type,id,file,altText,caption='',isPublic=false){
 const form=new FormData();form.set('type',type);form.set('id',id);form.set('photo',await compactPhoto(file));
 form.set('altText',altText);form.set('caption',caption);form.set('isPublic',String(isPublic));
 return mediaApi('POST',form);
}

const viewTitles={overview:'Overview',flight:'Flight Radar',products:'Products',categories:'Categories',marketing:'Marketing',review:'Creator review',activity:'Activity',projects:'My projects',resources:'Guides & files',submissions:'Review status'};
const greeting=()=>{const hour=new Date().getHours();return hour<12?'Good morning, maker':hour<17?'Good afternoon, maker':'Good evening, maker';};
function showView(name){
 if(!$('view-'+name))return;
 document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!=='view-'+name);
 document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===name));
 $('breadcrumb-view').textContent=viewTitles[name];
 const headings={overview:portalKind==='admin'?[greeting(),'The practical work of getting My Little Project ready for launch.']:['Make something worth sharing','Develop an idea, gather its build notes and send them for a thoughtful review.'],flight:['Little Flight Radar','Validate the first kit and record the evidence behind every claim.'],products:['Products','Shape the catalogue, one product at a time.'],categories:['Categories','Give every build a place to belong.'],marketing:['Marketing plans','Plan the launch story.'],review:['Creator review','Thoughtful decisions for new ideas.'],activity:['Activity','Recent changes across the workspaces.'],projects:['My projects','A home for your next idea.'],resources:['Guides & file plans','Bring the build experience into focus.'],submissions:['Review status','See where your projects stand.']};
 $('page-title').textContent=headings[name][0]+'.';$('page-subtitle').textContent=headings[name][1];
 history.replaceState(null,'','#'+name);
}
function bindNavigation(){
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
 document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.jump)));
 document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{
  $(button.dataset.close).hidden=true;
  if(button.dataset.close==='product-form'){$('product-edit-stack').hidden=true;selectedProductId='';}
 }));
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
async function refresh(){
 if(portalKind==='admin'){const [workspace,launch]=await Promise.all([api(),readinessApi()]);data={...workspace,launch};renderAdmin();}
 else{data=await api();renderCreator();}
 $('top-status').textContent='Updated';
}
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
  selectedProductId=id;
  $('product-edit-stack').hidden=false;
  $('bom-form').hidden=true;
  $('product-bom-panel').hidden=!id;
  fillCategories(form.elements.namedItem('categoryId'),record?.categoryId);
  setForm(form,record?{...record,pricePounds:record.pricePence===null?'':(record.pricePence/100).toFixed(2),priceConfirmed:record.priceConfirmed===1}:{kitStage:'concept',visibility:'hidden',supplierStrategy:'undecided',priceConfirmed:false});
  form.elements.namedItem('slug').readOnly=Boolean(record&&['LP-001','LP-031','LP-036'].includes(record.id));
  const workshopLink=$('product-workshop-link');workshopLink.hidden=!id;workshopLink.href=id?'/workshop/products/view/?id='+encodeURIComponent(id):'/workshop/products/';
  $('product-photo-panel').hidden=!id;
  if(id){renderBom(id);renderProductPhoto(id);}
 }else if(type==='category')setForm(form,record?{...record,active:record.active===1}:{sortOrder:0,active:true});
 else setForm(form,record||{channel:'email',status:'idea'});
 form.elements.namedItem('id').value=id;
 form.scrollIntoView({block:'nearest',behavior:'smooth'});
}
const money=pence=>'£'+(pence/100).toFixed(2);
function productBom(productId){return (data.bomItems||[]).filter(item=>item.productId===productId);}
function renderProductPhoto(productId){
 const photo=photoFor('product',productId),form=$('product-photo-form'),preview=$('product-photo-preview');
 form.reset();setForm(form,{altText:photo?.altText||'',caption:photo?.caption||'',isPublic:photo?.isPublic===1});
 $('remove-product-photo').hidden=!photo;
 if(photo)privatePhoto(preview,'product',productId,photo.altText);
 else{preview.photoVersion=null;preview.replaceChildren(node('span','','No product photo uploaded yet'));}
}
function bomCost(items){
 const core=items.filter(item=>item.kitRole==='core');
 const sourced=core.filter(item=>item.buyPricePence!==null&&item.priceEvidence!=='estimate');
 return {core,sourced,missing:core.filter(item=>!sourced.includes(item)),subtotal:sourced.reduce((sum,item)=>sum+Math.ceil(item.buyPricePence*item.quantityPerKit/item.packQuantity),0)};
}
function bomSummary(items){
 if(!items.length)return 'No parts recorded yet. Add the parts needed to build one kit.';
 const cost=bomCost(items);
 const pending=cost.core.filter(item=>item.sourcingStatus!=='approved').length;
 const unavailable=cost.core.filter(item=>!['in_stock','low_stock'].includes(item.availability)).length;
 return `${cost.sourced.length}/${cost.core.length} core parts with sourced prices · known parts subtotal ${money(cost.subtotal)} per kit · ${cost.missing.length} unpriced or estimated · ${pending} not approved · ${unavailable} without confirmed stock.`;
}
function renderBom(productId){
 const items=productBom(productId),summary=$('bom-summary'),list=$('bom-list');
 summary.textContent=bomSummary(items);
 list.replaceChildren();
 if(!items.length)empty(list,'No parts yet. Add a part or load the Flight Radar starter requirements.');
 items.forEach(item=>{
  const card=node('article','bom-item');
  const head=node('div','bom-item-head');head.append(node('strong','',item.partName),node('span','pill '+(item.sourcingStatus==='approved'?'':'amber'),label(item.sourcingStatus)));
  const details=node('p','',`${label(item.kitRole)} · ${item.quantityPerKit} per kit · ${item.packQuantity} per pack · ${item.buyPricePence===null?'No buy price':`${money(item.buyPricePence)} per pack (${label(item.priceEvidence)})`}`);
  const supplier=node('p','',`${item.supplierName||'Supplier needed'}${item.supplierPartNumber?' · SKU '+item.supplierPartNumber:''}${item.manufacturerPartNumber?' · MPN '+item.manufacturerPartNumber:''}`);
  const stock=node('p','',`${label(item.availability)} · ${item.checkedAt?'checked '+item.checkedAt:'date needed'}${item.leadTimeDays===null?'':' · '+item.leadTimeDays+' days lead'}${item.productRevision?' · '+item.productRevision:''}`);
  card.append(head,details,supplier,stock);
  const photo=photoFor('bom',item.id);
  if(photo){const preview=node('div','photo-preview compact bom-card-photo');card.prepend(preview);privatePhoto(preview,'bom',item.id,photo.altText||item.partName);}
  if(item.supplierUrl){const link=node('a','bom-source','View supplier listing ↗');link.href=item.supplierUrl;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
  if(item.notes)card.append(node('p','bom-notes',item.notes));
  const edit=node('button','quiet-link','Edit part →');edit.type='button';edit.addEventListener('click',()=>openBomForm(item));card.append(edit);
  list.append(card);
 });
 $('seed-flight-bom').hidden=productId!=='LP-001'||['esp32-s3-zero','round-gc9a01','ky-040','jumpers','usb-c','case'].every(key=>items.some(item=>item.id==='lp001-'+key));
 $('flight-bom-summary').textContent=bomSummary(productBom('LP-001'));
}
function openBomForm(item=null){
 if(!selectedProductId)return;
 const form=$('bom-form');form.reset();form.hidden=false;
 setForm(form,item?{...item,buyPricePounds:item.buyPricePence===null?'':(item.buyPricePence/100).toFixed(2)}:{productId:selectedProductId,kitRole:'core',quantityPerKit:1,packQuantity:1,priceEvidence:'estimate',availability:'unknown',sourcingStatus:'research',sortOrder:0});
 form.elements.namedItem('id').value=item?.id||'';
 form.elements.namedItem('productId').value=selectedProductId;
 $('bom-form-title').textContent=item?'Edit part':'Add part';
 $('delete-bom-item').hidden=!item;
 const photo=item&&photoFor('bom',item.id),preview=$('bom-photo-preview');
 form.elements.namedItem('photoAlt').value=photo?.altText||'';
 $('remove-bom-photo').hidden=!photo;
 if(photo)privatePhoto(preview,'bom',item.id,photo.altText||item.partName);
 else{preview.photoVersion=null;preview.replaceChildren(node('span','','No part photo uploaded yet'));}
 form.scrollIntoView({block:'nearest',behavior:'smooth'});
}
const catalogueStats=products=>({
 total:products.length,
 ready:products.filter(p=>p.kitStage==='ready').length,
 core:products.filter(p=>p.priceConfirmed===1&&p.pricePence!==null&&p.pricePence<4000).length,
 premium:products.filter(p=>p.priceConfirmed===1&&p.pricePence!==null&&p.pricePence>=4000).length,
 supplierOpen:products.filter(p=>p.supplierStrategy==='undecided').length,
 priceOpen:products.filter(p=>p.priceConfirmed!==1).length
});
function productNextAction(products){
 const open=data.launch?.checks.find(check=>check.status!=='verified');
 if(open)return `Flight Radar first: ${open.nextAction||open.action}`;
 const starters=products.filter(p=>['LP-001','LP-031'].includes(p.id));
 const unfinished=starters.find(p=>p.kitStage!=='ready'||p.priceConfirmed!==1||p.supplierStrategy==='undecided');
 if(unfinished)return `Next: confirm the build guide, parts, safety and price for ${unfinished.title}; update its stage, price and supplier decision here.`;
 if(products.length<30)return `Next: research and record ${30-products.length} more catalogue ideas, keeping affordable solder-free family builds at the centre.`;
 return 'Next: settle checkout, payment and fulfilment decisions before opening orders.';
}
function renderFlight(){
 const checks=data.launch.checks,verified=checks.filter(x=>x.status==='verified').length;
 $('flight-count').textContent=`${verified} of ${checks.length} checks recorded as verified`;
 const first=checks.find(x=>x.status!=='verified');
 $('flight-next').textContent=first?`Highest-priority next action: ${first.nextAction||first.action}`:'All checks marked verified. Review the evidence and the full test order before considering launch.';
 $('overview-flight-count').textContent=`${verified} / ${checks.length} checks verified`;
 $('overview-flight-next').textContent=first?first.nextAction||first.action:'Review evidence and test the complete order flow.';
 $('flight-bom-summary').textContent=bomSummary(productBom('LP-001'));
 const container=$('flight-checks');container.replaceChildren();
 checks.forEach(check=>{
  const card=node('form','flight-check');card.dataset.checkKey=check.checkKey;
  const heading=node('div','flight-check-heading');heading.append(node('span','pill '+(check.status==='blocked'?'amber':check.status==='missing'?'grey':''),label(check.status)),node('h3','',check.title));
  card.append(heading,node('p','',check.detail));
  const fields=node('div','flight-fields');
  const selectLabel=node('label','','Status');const select=node('select');select.name='status';
  for(const [value,title] of [['missing','Missing'],['working','In progress'],['verified','Verified with evidence'],['blocked','Blocked']])select.append(new Option(title,value));
  select.value=check.status;selectLabel.append(select);fields.append(selectLabel);
  function field(title,name,value,multiline=false){const labelEl=node('label','',title);const input=node(multiline?'textarea':'input');input.name=name;input.maxLength=name==='evidenceNote'?1000:name==='evidenceUrl'?500:500;input.value=value||'';if(multiline)input.rows=2;else if(name==='evidenceUrl')input.type='url';labelEl.append(input);fields.append(labelEl);}
  field('Evidence note · required to verify','evidenceNote',check.evidenceNote,true);
  field('Evidence link · optional','evidenceUrl',check.evidenceUrl);
  field('Decision still needed','decisionNote',check.decisionNote,true);
  field('Specific next action','nextAction',check.nextAction,true);
  card.append(fields);
  const foot=node('div','flight-check-foot');foot.append(node('small','',check.updatedAt?'Updated '+date(check.updatedAt):'No evidence recorded yet'));
  const save=node('button','button primary','Save check →');save.type='submit';foot.append(save);card.append(foot);
  card.addEventListener('submit',async event=>{
   event.preventDefault();if(!card.reportValidity())return;save.disabled=true;
   try{await readinessApi('PATCH',{productId:'LP-001',checkKey:check.checkKey,status:select.value,evidenceNote:card.elements.namedItem('evidenceNote').value,evidenceUrl:card.elements.namedItem('evidenceUrl').value,decisionNote:card.elements.namedItem('decisionNote').value,nextAction:card.elements.namedItem('nextAction').value});await refresh();notice(`${check.title} updated. The same status is in the overview and launch snapshot.`);}
   catch(error){notice(errorMessage(error),true);}finally{save.disabled=false;}
  });container.append(card);
 });
}
function renderProductList(){
 const products=$('products-list');products.replaceChildren();
 const query=$('product-search').value.trim().toLowerCase();
 const stage=$('product-stage-filter').value,supplier=$('product-supplier-filter').value;
 const visible=data.products.filter(p=>(!query||[p.title,p.slug,p.id,p.summary].some(x=>String(x||'').toLowerCase().includes(query)))&&(!stage||p.kitStage===stage)&&(!supplier||p.supplierStrategy===supplier));
 $('product-results').textContent=`Showing ${visible.length} of ${data.products.length} product records`;
 if(!visible.length)return empty(products,data.products.length?'No products match those filters.':'No product records yet. Add the first concept.');
 visible.forEach(p=>products.append(row(p.title,`${p.id} · ${productBom(p.id).length} BOM parts · ${p.visibility==='preview'?'Public preview':'Internal only'} · ${p.priceConfirmed===1&&p.pricePence!==null?'£'+(p.pricePence/100).toFixed(2):'Price unconfirmed'} · ${p.repositoryUrl?'Git linked':'Git not linked'}`,p.kitStage,()=>openAdminForm('product',p),'✳')));
}
function downloadLaunchSnapshot(){
 const stats=catalogueStats(data.products);
 const list=(items,make)=>items.length?items.map(make).join('\n'):'- None recorded';
 const oneLine=value=>String(value||'').replace(/\s+/g,' ').trim();
 const radarItems=productBom('LP-001'),radarCost=bomCost(radarItems);
 const since=$('snapshot-since').value;
 const recent=since?data.audit.filter(x=>timestamp(x.createdAt)>=new Date(since+'T00:00:00')):data.audit;
 const flight=data.launch.checks;
 const open=flight.filter(x=>x.status!=='verified');
 const lines=[
  '# My Little Project — launch snapshot',
  `Generated: ${new Date().toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}`,
  `Review changes since: ${since||'not specified'}`,
  '',
  '## First launch candidate · Little Flight Radar',
  `- ${flight.length-open.length}/${flight.length} checks recorded as verified by the operator. This is not an independent certification.`,
  `- Product stage: ${data.products.find(x=>x.id==='LP-001')?.kitStage||'not recorded'}; price: ${data.products.find(x=>x.id==='LP-001')?.priceConfirmed===1?'confirmed in product record':'unconfirmed'}; supplier: ${data.products.find(x=>x.id==='LP-001')?.supplierStrategy||'unrecorded'}.`,
  `- Product photograph: ${photoFor('product','LP-001')?(photoFor('product','LP-001').isPublic===1?'recorded and selected for public preview':'recorded privately'):'not recorded'}; part photographs: ${radarItems.filter(x=>photoFor('bom',x.id)).length}/${radarItems.length}.`,
  '- Live checkout and customer entitlements are disabled.',
  '',
  '### Private bill of materials and sourcing',
  `- ${radarCost.sourced.length}/${radarCost.core.length} core parts have sourced prices. Known allocated parts subtotal: ${money(radarCost.subtotal)} inc VAT. ${radarCost.missing.length} core parts are unpriced or estimated. This is a partial cost, excluding delivery, packaging, assembly, fees and returns.`,
  list(radarItems,x=>`- ${oneLine(x.partName)} [${x.kitRole}]: ${x.quantityPerKit} per kit, ${x.packQuantity} per pack; ${x.buyPricePence===null?'buy price unknown':money(x.buyPricePence)+' per pack ('+x.priceEvidence+')'}; ${oneLine(x.supplierName)||'supplier needed'}${x.supplierPartNumber?' SKU '+oneLine(x.supplierPartNumber):''}${x.manufacturerPartNumber?' MPN '+oneLine(x.manufacturerPartNumber):''}; ${x.availability}; ${x.sourcingStatus}; checked ${x.checkedAt||'never'}${x.supplierUrl?' · '+x.supplierUrl:''}${x.evidenceNote?' · evidence: '+oneLine(x.evidenceNote):''}.`),
  '',
  '### Incomplete Flight Radar milestones and decisions',
  list(open,x=>`- ${x.title}: ${label(x.status)}. Next: ${x.nextAction||x.action}${x.decisionNote?' Decision: '+x.decisionNote:''}`),
  '',
  '### Recorded evidence versus assumptions',
  list(flight.filter(x=>x.status==='verified'),x=>`- ${x.title}: ${x.evidenceNote}${x.evidenceUrl?' ('+x.evidenceUrl+')':''} · updated ${date(x.updatedAt)}.`),
  '- Other checks are unverified; notes and concepts are assumptions until tested.',
  '',
  '## Catalogue',
  `- ${stats.total}/30 product records; ${stats.ready} marked kit-stage ready.`,
  `- ${stats.core} confirmed prices below £40; ${stats.premium} confirmed higher-price options.`,
  `- ${stats.priceOpen} prices unconfirmed; ${stats.supplierOpen} supplier approaches undecided.`,
  `- ${data.products.filter(p=>p.repositoryUrl).length} Git repositories, ${data.products.filter(p=>p.documentationUrl).length} docs links and ${data.products.filter(p=>p.videoUrl).length} YouTube links recorded.`,
  `- ${data.bomItems.length} private BOM rows across ${new Set(data.bomItems.map(x=>x.productId)).size} products.`,
  `- ${data.media.filter(x=>x.targetType==='product').length} product photographs and ${data.media.filter(x=>x.targetType==='bom').length} private part photographs recorded; ${data.media.filter(x=>x.targetType==='product'&&x.isPublic===1).length} product photographs selected for public preview.`,
  '',
  '## Incomplete product decisions',
  list(data.products.filter(p=>p.priceConfirmed!==1||p.supplierStrategy==='undecided'||p.kitStage!=='ready'),p=>`- ${p.title}: ${[p.kitStage!=='ready'?'kit stage '+p.kitStage:null,p.priceConfirmed!==1?'price unconfirmed':null,p.supplierStrategy==='undecided'?'supplier undecided':null].filter(Boolean).join('; ')}.`),
  '',
  '## Changes since selected review date',
  list(recent,a=>`- ${date(a.createdAt)}: ${label(a.action)} ${label(a.targetType)} (${a.targetId}).`),
  '',
  '## Evidence and assumptions',
  '- Evidence: the product, category, campaign and activity counts above come from the private production workspace.',
  '- Recorded stages and prices are operator entries; they are not independent proof of a finished BOM, safety assessment or supplier agreement.',
  '- MailerLite form is present on the public site. Checkout and payments are not connected.',
  '',
  '## Highest-priority next action',
  productNextAction(data.products),
  '',
  '## Other open launch work',
  '- Confirm checkout, payment provider, shipping, returns and drop-ship terms before taking orders.',
  '- Creator approvals are internal; marketplace rights, fees, royalties and customer portal are not live.'
 ];
 const blob=new Blob([lines.join('\n')+'\n'],{type:'text/markdown;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-little-project-launch-snapshot-'+new Date().toISOString().slice(0,10)+'.md';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderAdmin(){
 for(const url of photoObjectUrls)URL.revokeObjectURL(url);photoObjectUrls.clear();
 renderFlight();
 $('metric-products').textContent=data.products.length;
 $('metric-categories').textContent=data.categories.filter(x=>x.active).length;
 $('metric-campaigns').textContent=data.campaigns.length;
 const waiting=data.submissions.filter(x=>x.status==='submitted').length;
 $('metric-review').textContent=waiting;$('review-count').textContent=waiting;
 const stats=catalogueStats(data.products);
 $('metric-ready').textContent=stats.ready;$('metric-core').textContent=stats.core;
 $('metric-supplier-open').textContent=stats.supplierOpen;$('metric-price-open').textContent=stats.priceOpen;
 const progress=$('catalogue-progress');progress.value=Math.min(stats.total,30);
 $('catalogue-progress-label').textContent=`${stats.total} of 30 catalogue records`;
 $('catalogue-next').textContent=productNextAction(data.products);
 activity($('activity-list'),data.audit);activity($('overview-activity'),data.audit.slice(0,4));
 renderProductList();
 if(selectedProductId&&data.products.some(p=>p.id===selectedProductId)){
  renderBom(selectedProductId);renderProductPhoto(selectedProductId);
  if(!$('bom-form').hidden){const item=data.bomItems.find(x=>x.id===formValue($('bom-form'),'id'));if(item)openBomForm(item);}
 }
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
 $('snapshot-since').value=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
 for(const id of ['product-search','product-stage-filter','product-supplier-filter'])$(id).addEventListener(id==='product-search'?'input':'change',renderProductList);
 $('download-launch-snapshot').addEventListener('click',downloadLaunchSnapshot);
 $('flight-open-bom').addEventListener('click',()=>{
  const product=data.products.find(p=>p.id==='LP-001');
  if(!product)return notice('Flight Radar product record is not available yet.',true);
  showView('products');openAdminForm('product',product);$('product-bom-panel').scrollIntoView({block:'start',behavior:'smooth'});
 });
 $('new-bom-item').addEventListener('click',()=>openBomForm());
 $('seed-flight-bom').addEventListener('click',async event=>{
  event.currentTarget.disabled=true;
  try{await bomApi('POST',{productId:'LP-001',starter:true});await refresh();notice('Flight Radar starter requirements added without prices. Check the exact variants and source every part.');}
  catch(error){notice(errorMessage(error),true);}finally{event.currentTarget.disabled=false;}
 });
 const bomForm=$('bom-form');
 bomForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!bomForm.reportValidity())return;
  const pounds=formValue(bomForm,'buyPricePounds');
  const price=pounds===''?null:Number(pounds);
  if(price!==null&&(!Number.isFinite(price)||price<0))return notice('Enter a valid buy price.',true);
  const payload={id:formValue(bomForm,'id'),productId:formValue(bomForm,'productId'),partName:formValue(bomForm,'partName'),manufacturer:formValue(bomForm,'manufacturer'),manufacturerPartNumber:formValue(bomForm,'manufacturerPartNumber'),supplierName:formValue(bomForm,'supplierName'),supplierPartNumber:formValue(bomForm,'supplierPartNumber'),supplierUrl:formValue(bomForm,'supplierUrl'),kitRole:formValue(bomForm,'kitRole'),quantityPerKit:Number(formValue(bomForm,'quantityPerKit')),packQuantity:Number(formValue(bomForm,'packQuantity')),buyPricePence:price===null?null:Math.round(price*100),priceEvidence:formValue(bomForm,'priceEvidence'),evidenceNote:formValue(bomForm,'evidenceNote'),checkedAt:formValue(bomForm,'checkedAt'),availability:formValue(bomForm,'availability'),leadTimeDays:formValue(bomForm,'leadTimeDays')===''?null:Number(formValue(bomForm,'leadTimeDays')),sourcingStatus:formValue(bomForm,'sourcingStatus'),productRevision:formValue(bomForm,'productRevision'),notes:formValue(bomForm,'notes'),sortOrder:Number(formValue(bomForm,'sortOrder'))};
  const button=bomForm.querySelector('[type=submit]');button.disabled=true;
  try{
   const saved=await bomApi(payload.id?'PATCH':'POST',payload),id=payload.id||saved.id;
   const photo=bomForm.elements.namedItem('photo').files[0],alt=formValue(bomForm,'photoAlt').trim()||payload.partName;
   let photoError=false;
   try{
    if(photo)await uploadPhoto('bom',id,photo,alt);
    else if(photoFor('bom',id))await mediaApi('PATCH',{type:'bom',id,altText:alt,caption:'',isPublic:false});
   }catch(error){photoError=error;}
   bomForm.hidden=true;await refresh();
   notice(photoError?`Part saved, but the photo could not be saved: ${errorMessage(photoError)}`:'Part and sourcing evidence saved. The product subtotal has been recalculated.',Boolean(photoError));
  }
  catch(error){notice(errorMessage(error),true);}finally{button.disabled=false;}
 });
 $('remove-bom-photo').addEventListener('click',async event=>{
  const id=formValue(bomForm,'id');if(!id)return;
  event.currentTarget.disabled=true;
  try{await mediaApi('DELETE',{type:'bom',id});await refresh();notice('Part photo removed.');}
  catch(error){notice(errorMessage(error),true);}finally{event.currentTarget.disabled=false;}
 });
 $('delete-bom-item').addEventListener('click',async event=>{
  const id=formValue(bomForm,'id'),productId=formValue(bomForm,'productId');
  if(!id||!window.confirm('Delete this part from the bill of materials?'))return;
  event.currentTarget.disabled=true;
  try{await bomApi('DELETE',{id,productId});bomForm.hidden=true;await refresh();notice('Part removed from the BOM.');}
  catch(error){notice(errorMessage(error),true);}finally{event.currentTarget.disabled=false;}
 });
 const productPhotoForm=$('product-photo-form');
 productPhotoForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!productPhotoForm.reportValidity())return;
  const id=selectedProductId,photo=productPhotoForm.elements.namedItem('photo').files[0];
  if(!id)return notice('Save the product before adding its photo.',true);
  if(!photo&&!photoFor('product',id))return notice('Choose an image to upload.',true);
  const altText=formValue(productPhotoForm,'altText').trim(),caption=formValue(productPhotoForm,'caption').trim();
  const isPublic=productPhotoForm.elements.namedItem('isPublic').checked;
  if(isPublic&&!altText)return notice('Describe the photo before publishing it.',true);
  const button=productPhotoForm.querySelector('[type=submit]');button.disabled=true;
  try{
   if(photo)await uploadPhoto('product',id,photo,altText,caption,isPublic);
   else await mediaApi('PATCH',{type:'product',id,altText,caption,isPublic});
   await refresh();notice(isPublic?'Product photo saved for public preview.':'Product photo saved privately.');
  }catch(error){notice(errorMessage(error),true);}finally{button.disabled=false;}
 });
 $('remove-product-photo').addEventListener('click',async event=>{
  if(!selectedProductId)return;
  event.currentTarget.disabled=true;
  try{await mediaApi('DELETE',{type:'product',id:selectedProductId});await refresh();notice('Product photo removed. Concept artwork will appear on the public preview.');}
  catch(error){notice(errorMessage(error),true);}finally{event.currentTarget.disabled=false;}
 });
 for(const type of ['product','category','campaign']){
  $('new-'+type).addEventListener('click',()=>openAdminForm(type,null));
  const form=$(type+'-form');form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const id=formValue(form,'id');const payload={type,id};
   if(type==='product'){
    const price=formValue(form,'pricePounds');const amount=price===''?null:Number(price);
    if(amount!==null&&!Number.isFinite(amount))return notice('Enter a valid price.',true);
    Object.assign(payload,{title:formValue(form,'title'),slug:formValue(form,'slug'),categoryId:formValue(form,'categoryId')||null,summary:formValue(form,'summary'),description:formValue(form,'description'),kitStage:formValue(form,'kitStage'),visibility:formValue(form,'visibility'),pricePence:amount===null?null:Math.round(amount*100),priceConfirmed:form.elements.namedItem('priceConfirmed').checked,supplierStrategy:formValue(form,'supplierStrategy'),repositoryUrl:formValue(form,'repositoryUrl'),documentationUrl:formValue(form,'documentationUrl'),videoUrl:formValue(form,'videoUrl')});
   }else if(type==='category')Object.assign(payload,{name:formValue(form,'name'),slug:formValue(form,'slug'),description:formValue(form,'description'),sortOrder:Number(formValue(form,'sortOrder')),active:form.elements.namedItem('active').checked});
   else Object.assign(payload,{title:formValue(form,'title'),channel:formValue(form,'channel'),status:formValue(form,'status'),audience:formValue(form,'audience'),brief:formValue(form,'brief'),scheduledFor:formValue(form,'scheduledFor')||null});
   const button=form.querySelector('[type=submit]');button.disabled=true;
   try{
    const saved=await api(id?'PATCH':'POST',payload);
    form.hidden=true;await refresh();
    if(type==='product'){
     const product=data.products.find(p=>p.id===(id||saved.id));
     if(product)openAdminForm('product',product);
    }
    notice(`${label(type)} saved.`);
   }catch(e){notice(errorMessage(e),true);}finally{button.disabled=false;}
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
function creatorRequirements(project){return [
 ['Summary of at least 20 characters',(project.summary||'').length>=20],
 ['Build concept of at least 50 characters',(project.concept||'').length>=50],
 ['Guide or parts-list note',data.resources.some(r=>r.projectId===project.id&&['guide','bom_note'].includes(r.kind))]
];}
function creatorCard(project){
 const card=node('article','submission-card');card.append(node('span','eyebrow',`UPDATED ${date(project.updatedAt)}`),node('h3','',project.title),node('span','pill',label(project.status)),node('p','',project.summary||'Add a short summary to help the team understand the idea.'));
 if(project.adminFeedback)card.append(node('p','feedback','Feedback: '+project.adminFeedback));
 const requirements=creatorRequirements(project),checks=node('ul','submission-checklist');
 requirements.forEach(([title,done])=>{const item=node('li',done?'done':'needed',`${done?'✓':'○'} ${title}`);checks.append(item);});card.append(checks);
 const actions=node('div','actions');
 if(editable(project)){
  const edit=node('button','button secondary','Edit draft');edit.type='button';edit.addEventListener('click',()=>{showView('projects');openCreatorForm('project',project);});actions.append(edit);
  const submit=node('button','button primary','Submit for review →');submit.type='button';submit.disabled=project.status!=='draft'||!requirements.every(([,done])=>done);submit.addEventListener('click',async()=>{submit.disabled=true;try{await api('POST',{type:'submit',id:project.id});await refresh();notice(`${project.title} sent for review.`);}catch(e){notice(errorMessage(e),true);}finally{submit.disabled=false;}});actions.append(submit);
  if(project.status==='changes_requested')actions.append(node('p','form-hint','Update this project or one of its build notes before resubmitting.'));
  else if(submit.disabled)actions.append(node('p','form-hint','Complete the checklist before submitting. Add build notes in Guides & files.'));
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
  const requested=location.hash.slice(1);showView($('view-'+requested)?requested:'overview');
 }catch(error){
  gateMessage.textContent=error.message==='sign_in_not_configured'?'Sign-in is being configured for this site.':errorMessage(error);
 }
});

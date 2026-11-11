(async()=>{
 try{
  const detail=document.querySelector('[data-shop-slug]');
  const response=await fetch('/api/shop'+(detail?'?slug='+encodeURIComponent(detail.dataset.shopSlug):''));
  if(!response.ok)return;
  const {products}=await response.json();
  if(detail){
   const product=products?.[0];if(!product)return;
   const title=document.getElementById('shop-title');const description=document.getElementById('shop-description');
   if(title)title.firstChild.textContent=product.title;
   if(description&&product.description)description.textContent=product.description;
   if(product.photoUrl){
    const stage=detail.querySelector('.pdp-stage'),image=stage?.querySelector('img');
    if(stage&&image){stage.classList.add('is-photo');image.src=product.photoUrl;image.alt=product.photoAlt;}
    const caption=stage?.querySelector('.stage-bottom span');
    if(caption)caption.textContent=product.photoCaption||'PHOTO OF THE CURRENT KIT';
   }
   return;
  }
  for(const product of products||[]){
   const card=[...document.querySelectorAll('[data-shop-id]')].find(e=>e.dataset.shopId===product.id);
   if(!card)continue;
   const title=card.querySelector('.card-content h3 a');const summary=card.querySelector('.card-content p');const category=card.querySelector('.card-meta span');
   if(title)title.textContent=product.title;
   if(summary&&product.summary)summary.textContent=product.summary;
   if(category)category.textContent=product.id+' / '+(product.category||'New project');
   if(product.photoUrl){
    const art=card.querySelector('.project-art'),image=art?.querySelector('img');
    if(art){art.classList.add('has-photo');if(image){image.src=product.photoUrl;image.alt=product.photoAlt;}else{const photo=document.createElement('img');photo.src=product.photoUrl;photo.alt=product.photoAlt;photo.loading='lazy';art.prepend(photo);}}
    const corner=art?.querySelector('.art-corner');if(corner)corner.textContent='CURRENT KIT PHOTO';
   }
  }
  for(const product of products||[]){
   if(!product.photoUrl)continue;
   const selector=product.id==='LP-001'?'.paper-radar img':product.id==='LP-031'?'.showcase-buggy img':'';
   const feature=selector?document.querySelector(selector):null;
   if(feature){feature.src=product.photoUrl;feature.alt=product.photoAlt;feature.parentElement.classList.add('has-photo');}
   if(product.id==='LP-001'){const hero=document.querySelector('.showcase-radar img');if(hero){hero.src=product.photoUrl;hero.alt=product.photoAlt;hero.parentElement.classList.add('has-photo');}}
  }
  const grid=document.getElementById('catalogue-grid');
  if(!grid)return;
  const newProducts=(products||[]).filter(p=>!['LP-001','LP-031','LP-036'].includes(p.id));
  if(!newProducts.length)return;
  const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  newProducts.forEach(p=>{
   const card=element('article','project-card');const art=element('a','card-art-link');art.href='/projects/preview/?slug='+encodeURIComponent(p.slug);art.setAttribute('aria-label','Explore '+p.title);
   const image=element('div','project-art art-radar catalogue-preview-art');
   if(p.photoUrl){const photo=element('img');photo.src=p.photoUrl;photo.alt=p.photoAlt;photo.loading='lazy';image.classList.add('has-photo');image.append(photo);}
   else image.append(element('span','catalogue-symbol','✳'));
   image.append(element('span','art-corner',p.photoUrl?'CURRENT KIT PHOTO':'MLP / IN THE MAKING'));art.append(image);
   const body=element('div','card-content');const meta=element('div','card-meta');meta.append(element('span','',p.category||'New project'),element('span','status-dot','In development'));
   const heading=element('h3');const link=element('a','',p.title);link.href=art.href;heading.append(link);
   const more=element('a','text-link','Explore the project →');more.href=art.href;
   body.append(meta,heading,element('p','',p.summary||'A new project concept is taking shape.'),more);card.append(art,body);grid.append(card);
  });
  document.getElementById('catalogue-preview').hidden=false;
 }catch{ /* Public static projects remain available when the catalogue API is not configured. */ }
})();

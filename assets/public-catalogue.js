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
   return;
  }
  for(const product of products||[]){
   const card=[...document.querySelectorAll('[data-shop-id]')].find(e=>e.dataset.shopId===product.id);
   if(!card)continue;
   const title=card.querySelector('.card-content h3 a');const summary=card.querySelector('.card-content p');const category=card.querySelector('.card-meta span');
   if(title)title.textContent=product.title;
   if(summary&&product.summary)summary.textContent=product.summary;
   if(category)category.textContent=product.id+' / '+(product.category||'New project');
  }
  const grid=document.getElementById('catalogue-grid');
  if(!grid)return;
  const newProducts=(products||[]).filter(p=>!['LP-001','LP-031','LP-036'].includes(p.id));
  if(!newProducts.length)return;
  const element=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  newProducts.forEach(p=>{
   const card=element('article','project-card');const art=element('a','card-art-link');art.href='/projects/preview/?slug='+encodeURIComponent(p.slug);art.setAttribute('aria-label','Explore '+p.title);
   const image=element('div','project-art art-radar catalogue-preview-art');image.append(element('span','catalogue-symbol','✳'),element('span','art-corner','MLP / IN THE MAKING'));art.append(image);
   const body=element('div','card-content');const meta=element('div','card-meta');meta.append(element('span','',p.category||'New project'),element('span','status-dot','In development'));
   const heading=element('h3');const link=element('a','',p.title);link.href=art.href;heading.append(link);
   const more=element('a','text-link','Explore the project →');more.href=art.href;
   body.append(meta,heading,element('p','',p.summary||'A new project concept is taking shape.'),more);card.append(art,body);grid.append(card);
  });
  document.getElementById('catalogue-preview').hidden=false;
 }catch{ /* Public static projects remain available when the catalogue API is not configured. */ }
})();

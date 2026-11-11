(async()=>{
 const slug=new URLSearchParams(location.search).get('slug');
 if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){document.getElementById('description').textContent='This project could not be found.';return;}
 try{
  const response=await fetch('/api/shop?slug='+encodeURIComponent(slug));
  if(!response.ok)throw Error();
  const product=(await response.json()).products?.[0];
  if(!product)throw Error();
  document.title=product.title+' · My Little Project';
  document.getElementById('title').firstChild.textContent=product.title;
  document.getElementById('category').textContent=product.category||'Build something brilliant.';
  document.getElementById('description').textContent=product.description||product.summary||'This idea is taking shape.';
  document.getElementById('stage').textContent=product.kitStage==='concept'?'Concept in development':'Prototype in development';
  if(product.photoUrl){
   const visual=document.querySelector('.preview-visual'),art=visual.querySelector('.product-visual-art');
   const image=document.createElement('img');image.src=product.photoUrl;image.alt=product.photoAlt;
   art.replaceChildren(image);visual.classList.add('has-photo');
   visual.querySelector('.product-visual-top span').textContent='CURRENT PRODUCT / FIRST LOOK';
   visual.querySelector('.product-visual-caption span').textContent=product.photoCaption||'Photo of the current kit';
  }
 }catch{document.getElementById('description').textContent='This project preview is unavailable right now. Explore our other projects or check back soon.';}
})();

import {imageResponse} from './shop-media.js';

// Photos are published explicitly and only while the product is a public preview.
export async function onRequestGet({request,env}){
 const missing=()=>new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!env.DB)return missing();
 const id=new URL(request.url).searchParams.get('id');
 if(!id||!/^[-_a-zA-Z0-9]{1,80}$/.test(id))return missing();
 try{
  const row=await env.DB.prepare(`SELECT m.image_data,m.mime_type FROM shop_media m
   JOIN shop_products p ON p.id=m.product_id AND p.id=m.target_id
   WHERE m.target_type='product' AND m.target_id=? AND m.is_public=1 AND p.visibility='preview'
   AND (p.category_id IS NULL OR EXISTS(SELECT 1 FROM shop_categories c WHERE c.id=p.category_id AND c.active=1))`).bind(id).first();
  return row?imageResponse(row,'public, max-age=60'):missing();
 }catch{return missing();}
}

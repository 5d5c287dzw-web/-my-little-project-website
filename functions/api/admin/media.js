import {requireStaff,requireMutationRequest,staffJson,staffError,AccessError} from '../staff-auth.js';
import {ensureShopMedia,imageResponse} from '../shop-media.js';
import {ensureProductBom} from '../product-bom.js';

const maxBytes=400_000;
const field=(value,max)=>{
 if(typeof value!=='string'||value.trim().length>max)throw new AccessError('invalid_input',400);
 return value.trim();
};
const target=(type,id)=>{
 if(type!=='product'&&type!=='bom')throw new AccessError('invalid_input',400);
 return {type,id:field(id,80)};
};
const audit=(db,actor,action,type,id)=>db.prepare('INSERT INTO staff_audit_events(id,actor_clerk_user_id,action,target_type,target_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,type==='bom'?'bom_photo':'product_photo',id);
const sameOrigin=request=>{
 if(request.headers.get('Origin')!==new URL(request.url).origin)throw new AccessError('origin_not_allowed',403);
};
function mimeOf(bytes){
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 throw new AccessError('invalid_image',400);
}
async function existingTarget(db,type,id){
 const sql=type==='product'?'SELECT id AS productId FROM shop_products WHERE id=?':'SELECT product_id AS productId FROM shop_product_bom_items WHERE id=?';
 const row=await db.prepare(sql).bind(id).first();
 if(!row)throw new AccessError('record_not_found',404);
 return row.productId;
}
async function readJson(request){
 requireMutationRequest(request);
 const body=await request.json().catch(()=>{throw new AccessError('invalid_json',400);});
 if(!body||Array.isArray(body)||typeof body!=='object')throw new AccessError('invalid_json',400);
 return body;
}
async function metadata(db,actor,{type,id,altText,caption,isPublic}){
 const alt=field(altText,180),note=field(caption,240);
 if(typeof isPublic!=='boolean'||(isPublic&&type!=='product')||(isPublic&&!alt))throw new AccessError('invalid_input',400);
 const row=await db.prepare('SELECT target_id FROM shop_media WHERE target_type=? AND target_id=?').bind(type,id).first();
 if(!row)throw new AccessError('record_not_found',404);
 await db.batch([
  db.prepare('UPDATE shop_media SET alt_text=?,caption=?,is_public=?,updated_at=CURRENT_TIMESTAMP WHERE target_type=? AND target_id=?').bind(alt,note,isPublic?1:0,type,id),
  audit(db,actor.userId,'update',type,id)
 ]);
 return {saved:true,type,id};
}
export async function onRequestGet({request,env}){
 try{
  await requireStaff(request,env,'admin');
  await ensureShopMedia(env.DB);
  const url=new URL(request.url),{type,id}=target(url.searchParams.get('type'),url.searchParams.get('id'));
  const row=await env.DB.prepare('SELECT image_data,mime_type FROM shop_media WHERE target_type=? AND target_id=?').bind(type,id).first();
  if(!row)throw new AccessError('record_not_found',404);
  return imageResponse(row);
 }catch(error){return staffError(error);}
}
export async function onRequestPost({request,env}){
 try{
  const actor=await requireStaff(request,env,'admin');
  sameOrigin(request);
  if(!/^multipart\/form-data\s*;/i.test(request.headers.get('Content-Type')||''))throw new AccessError('image_form_required',415);
  if(Number(request.headers.get('Content-Length')||0)>600_000)throw new AccessError('request_too_large',413);
  const form=await request.formData();
  const {type,id}=target(form.get('type'),form.get('id'));
  const file=form.get('photo');
  if(!file||typeof file.arrayBuffer!=='function'||file.size<20||file.size>maxBytes)throw new AccessError('invalid_image_size',413);
  const bytes=new Uint8Array(await file.arrayBuffer()),mime=mimeOf(bytes);
  if(file.type!==mime)throw new AccessError('invalid_image',400);
  const alt=field(form.get('altText')??'',180),caption=field(form.get('caption')??'',240);
  const isPublic=form.get('isPublic')==='true';
  if((isPublic&&type!=='product')||(isPublic&&!alt))throw new AccessError('invalid_input',400);
  if(type==='bom')await ensureProductBom(env.DB);
  await ensureShopMedia(env.DB);
  const productId=await existingTarget(env.DB,type,id);
  await env.DB.batch([
   env.DB.prepare(`INSERT INTO shop_media(target_type,target_id,product_id,image_data,mime_type,alt_text,caption,is_public)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(target_type,target_id) DO UPDATE SET
    image_data=excluded.image_data,mime_type=excluded.mime_type,alt_text=excluded.alt_text,
    caption=excluded.caption,is_public=excluded.is_public,updated_at=CURRENT_TIMESTAMP`)
    .bind(type,id,productId,bytes,mime,alt,caption,isPublic?1:0),
   audit(env.DB,actor.userId,'upload',type,id)
  ]);
  return staffJson({saved:true,type,id});
 }catch(error){return staffError(error);}
}
export async function onRequestPatch({request,env}){
 try{
  const actor=await requireStaff(request,env,'admin'),body=await readJson(request);
  const {type,id}=target(body.type,body.id);
  await ensureShopMedia(env.DB);
  return staffJson(await metadata(env.DB,actor,{type,id,altText:body.altText,caption:body.caption,isPublic:body.isPublic}));
 }catch(error){return staffError(error);}
}
export async function onRequestDelete({request,env}){
 try{
  const actor=await requireStaff(request,env,'admin'),body=await readJson(request);
  const {type,id}=target(body.type,body.id);
  await ensureShopMedia(env.DB);
  const row=await env.DB.prepare('SELECT target_id FROM shop_media WHERE target_type=? AND target_id=?').bind(type,id).first();
  if(!row)throw new AccessError('record_not_found',404);
  await env.DB.batch([
   env.DB.prepare('DELETE FROM shop_media WHERE target_type=? AND target_id=?').bind(type,id),
   audit(env.DB,actor.userId,'delete',type,id)
  ]);
  return staffJson({saved:true,type,id});
 }catch(error){return staffError(error);}
}

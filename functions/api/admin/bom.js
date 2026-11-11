import {requireStaff,requireMutationRequest,staffJson,staffError,AccessError} from '../staff-auth.js';
import {ensureProductBom} from '../product-bom.js';
import {ensureShopMedia} from '../shop-media.js';

const text=(value,max,required=false)=>{
 if(typeof value!=='string')throw new AccessError('invalid_input',400);
 const result=value.trim();
 if(result.length>max||(required&&!result))throw new AccessError('invalid_input',400);
 return result;
};
const integer=(value,min,max)=>{
 if(!Number.isInteger(value)||value<min||value>max)throw new AccessError('invalid_input',400);
 return value;
};
const choice=(value,options)=>{
 if(!options.includes(value))throw new AccessError('invalid_input',400);
 return value;
};
const url=value=>{
 const raw=text(value,500);
 if(!raw)return '';
 let parsed;try{parsed=new URL(raw);}catch{throw new AccessError('invalid_supplier_url',400);}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||/\s/.test(raw))throw new AccessError('invalid_supplier_url',400);
 return parsed.href;
};
const checkedDate=value=>{
 const raw=text(value,10);
 if(!raw)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||Number.isNaN(Date.parse(raw))||new Date(raw).toISOString().slice(0,10)!==raw||raw>new Date().toISOString().slice(0,10))throw new AccessError('invalid_checked_date',400);
 return raw;
};
const audit=(db,actor,action,id,productId)=>db.prepare('INSERT INTO staff_audit_events(id,actor_clerk_user_id,action,target_type,target_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,'product_bom',productId+':'+id);

async function readBody(request){
 requireMutationRequest(request);
 const raw=await request.text();
 if(raw.length>8192)throw new AccessError('request_too_large',413);
 try{const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error();return body;}
 catch{throw new AccessError('invalid_json',400);}
}
function values(body){
 const result={
  partName:text(body.partName,120,true),manufacturer:text(body.manufacturer??'',120),
  manufacturerPartNumber:text(body.manufacturerPartNumber??'',120),supplierName:text(body.supplierName??'',120),
  supplierPartNumber:text(body.supplierPartNumber??'',120),supplierUrl:url(body.supplierUrl??''),
  kitRole:choice(body.kitRole,['core','optional','alternative']),
  quantityPerKit:integer(body.quantityPerKit,1,1000),packQuantity:integer(body.packQuantity,1,10000),
  buyPricePence:body.buyPricePence===null?null:integer(body.buyPricePence,0,100000000),
  priceEvidence:choice(body.priceEvidence,['estimate','listing','cart','quote','invoice']),
  evidenceNote:text(body.evidenceNote??'',500),checkedAt:checkedDate(body.checkedAt??''),
  availability:choice(body.availability,['unknown','in_stock','low_stock','backorder','out_of_stock','discontinued']),
  leadTimeDays:body.leadTimeDays===null?null:integer(body.leadTimeDays,0,365),
  sourcingStatus:choice(body.sourcingStatus,['research','candidate','ordered','tested','approved','rejected']),
  productRevision:text(body.productRevision??'',40),notes:text(body.notes??'',1000),sortOrder:integer(body.sortOrder??0,0,9999)
 };
 // A sourced price must be traceable to a listing or a described quote/cart.
 if(result.buyPricePence!==null&&result.priceEvidence!=='estimate'&&(!result.supplierName||!result.checkedAt||(!result.supplierUrl&&result.evidenceNote.length<10)))throw new AccessError('price_source_required',400);
 return result;
}
const cols=['part_name','manufacturer','manufacturer_part_number','supplier_name','supplier_part_number','supplier_url','kit_role','quantity_per_kit','pack_quantity','buy_price_pence','price_evidence','evidence_note','checked_at','availability','lead_time_days','sourcing_status','product_revision','notes','sort_order'];
const keys=['partName','manufacturer','manufacturerPartNumber','supplierName','supplierPartNumber','supplierUrl','kitRole','quantityPerKit','packQuantity','buyPricePence','priceEvidence','evidenceNote','checkedAt','availability','leadTimeDays','sourcingStatus','productRevision','notes','sortOrder'];
const radarStarter=[
 ['esp32-s3-zero','ESP32-S3 Zero development board','Confirm the S3 variant; a C3 Zero is not an interchangeable part.'],
 ['round-gc9a01','1.28-inch 240×240 GC9A01 SPI breakout','Use a pin-header breakout module, not a bare ribbon display.'],
 ['ky-040','KY-040 rotary encoder module','One encoder module with push switch; verify it is supplied with headers.'],
 ['jumpers','Pre-terminated jumper leads','Confirm the connector genders and lengths against both boards.'],
 ['usb-c','USB power/data cable','Confirm the development board connector and power requirement.'],
 ['case','3D printed enclosure','Record filament, print time, fasteners, fit and revision before costing.']
];
async function seedRadar(db,actor){
 const exists=await db.prepare("SELECT id FROM shop_products WHERE id='LP-001'").first();
 if(!exists)throw new AccessError('record_not_found',404);
 await db.batch([
  ...radarStarter.map(([key,name,note],order)=>db.prepare('INSERT OR IGNORE INTO shop_product_bom_items(id,product_id,part_name,notes,sort_order) VALUES(?,?,?,?,?)').bind('lp001-'+key,'LP-001',name,note,(order+1)*10)),
  audit(db,actor,'seed','starter','LP-001')
 ]);
 return {saved:true,productId:'LP-001',starter:true};
}
async function mutate({request,env},method){
 try{
  const actor=await requireStaff(request,env,'admin');
  const body=await readBody(request);
  if(method==='POST'&&body.starter===true){
   if(body.productId!=='LP-001')throw new AccessError('invalid_input',400);
   await ensureProductBom(env.DB);
   return staffJson(await seedRadar(env.DB,actor.userId));
  }
  const productId=text(body.productId,80,true),itemId=method==='POST'?crypto.randomUUID():text(body.id,80,true);
  await ensureProductBom(env.DB);
  if(method==='POST'){
   const exists=await env.DB.prepare('SELECT id FROM shop_products WHERE id=?').bind(productId).first();
   if(!exists)throw new AccessError('record_not_found',404);
  }else{
   const exists=await env.DB.prepare('SELECT id FROM shop_product_bom_items WHERE id=? AND product_id=?').bind(itemId,productId).first();
   if(!exists)throw new AccessError('record_not_found',404);
  }
  if(method==='DELETE'){
   await ensureShopMedia(env.DB);
   await env.DB.batch([env.DB.prepare("DELETE FROM shop_media WHERE target_type='bom' AND target_id=?").bind(itemId),env.DB.prepare('DELETE FROM shop_product_bom_items WHERE id=? AND product_id=?').bind(itemId,productId),audit(env.DB,actor.userId,'delete',itemId,productId)]);
  }else{
   const input=values(body),fields=keys.map(key=>input[key]);
   const write=method==='POST'
    ?env.DB.prepare(`INSERT INTO shop_product_bom_items(id,product_id,${cols.join(',')}) VALUES(${Array(cols.length+2).fill('?').join(',')})`).bind(itemId,productId,...fields)
    :env.DB.prepare(`UPDATE shop_product_bom_items SET ${cols.map(col=>col+'=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=? AND product_id=?`).bind(...fields,itemId,productId);
   await env.DB.batch([write,audit(env.DB,actor.userId,method==='POST'?'create':'update',itemId,productId)]);
  }
  return staffJson({saved:true,id:itemId,productId});
 }catch(error){return staffError(error);}
}
export const onRequestPost=context=>mutate(context,'POST');
export const onRequestPatch=context=>mutate(context,'PATCH');
export const onRequestDelete=context=>mutate(context,'DELETE');

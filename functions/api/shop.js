// Public preview catalogue. Administrative and creator draft fields are never returned.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff"}});
export async function onRequestGet({request,env}){
 if(!env.DB)return json({products:[],available:false});
 try{
  const slug=new URL(request.url).searchParams.get("slug");
  if(slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return json({error:"invalid_slug"},400);
  const query=`SELECT p.id,p.slug,p.title,p.summary,p.description,p.kit_stage AS kitStage,
    CASE WHEN p.price_confirmed=1 THEN p.price_pence ELSE NULL END AS pricePence,
    c.name AS category FROM shop_products p LEFT JOIN shop_categories c ON c.id=p.category_id
    WHERE p.visibility='preview' AND (c.active=1 OR c.id IS NULL) ${slug?"AND p.slug=?":""}
    ORDER BY p.updated_at DESC LIMIT 100`;
  const statement=env.DB.prepare(query);
  const {results}=await (slug?statement.bind(slug):statement).all();
  // Media is optional until the first authorised Admin Desk visit creates the table.
  try{
   const {results:photos}=await env.DB.prepare("SELECT target_id AS id,alt_text AS altText,caption,updated_at AS updatedAt FROM shop_media WHERE target_type='product' AND is_public=1 LIMIT 100").all();
   const byId=new Map(photos.map(photo=>[photo.id,photo]));
   for(const product of results){
    const photo=byId.get(product.id);
    if(photo&&photo.altText){
     product.photoUrl='/api/product-photo?id='+encodeURIComponent(product.id)+'&v='+encodeURIComponent(photo.updatedAt);
     product.photoAlt=photo.altText;
     product.photoCaption=photo.caption;
    }
   }
  }catch{ /* No product photo table yet; keep the concept artwork. */ }
  return json({products:results,available:true});
 }catch{return json({error:"catalogue_unavailable"},503);}
}

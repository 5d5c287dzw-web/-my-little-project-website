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
  return json({products:results,available:true});
 }catch{return json({error:"catalogue_unavailable"},503);}
}

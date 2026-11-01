// Cloudflare Pages Function: public read-only catalogue. Requires D1 binding "DB".
// No authentication, customer records or private resource keys are exposed.
export async function onRequestGet({ env }) {
  const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" };
  if (!env.DB) return new Response(JSON.stringify({error:"catalogue_not_configured"}),{status:503,headers});
  try {
    const {results} = await env.DB.prepare(`SELECT p.id,p.title,p.category,p.status,p.description,
      r.revision, a.sku,a.name AS part_name,a.kind,a.status AS part_status
      FROM projects p JOIN project_revisions r ON r.project_id=p.id
      LEFT JOIN part_compatibility pc ON pc.revision_id=r.id
      LEFT JOIN parts a ON a.id=pc.part_id
      ORDER BY p.id,r.revision,a.sku`).all();
    const projects = new Map();
    for (const row of results) {
      const key=row.id+"::"+row.revision;
      if (!projects.has(key)) projects.set(key,{id:row.id,title:row.title,category:row.category,status:row.status,description:row.description,revision:row.revision,parts:[]});
      if (row.sku) projects.get(key).parts.push({sku:row.sku,name:row.part_name,kind:row.kind,status:row.part_status});
    }
    return new Response(JSON.stringify({projects:[...projects.values()]}),{status:200,headers});
  } catch {
    return new Response(JSON.stringify({error:"catalogue_unavailable"}),{status:503,headers});
  }
}

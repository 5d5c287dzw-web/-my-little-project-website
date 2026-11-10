import {AccessError} from './staff-auth.js';

// Workshop resource links are owner-preview metadata, separate from the public
// catalogue and from any future customer entitlement or file delivery system.
const schema=`CREATE TABLE IF NOT EXISTS shop_product_links (
 product_id TEXT PRIMARY KEY REFERENCES shop_products(id) ON DELETE CASCADE,
 repository_url TEXT NOT NULL DEFAULT '',
 documentation_url TEXT NOT NULL DEFAULT '',
 video_url TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const ensureProductLinks=db=>db.prepare(schema).run();

const videoHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be']);
function checkedUrl(value,kind){
 if(typeof value!=='string')throw new AccessError(`invalid_${kind}_url`,400);
 const raw=value.trim();
 if(!raw)return '';
 if(raw.length>500||/\s/.test(raw))throw new AccessError(`invalid_${kind}_url`,400);
 let url;
 try{url=new URL(raw);}catch{throw new AccessError(`invalid_${kind}_url`,400);}
 if(url.protocol!=='https:'||url.username||url.password||!url.hostname||url.port)throw new AccessError(`invalid_${kind}_url`,400);
 if(kind==='video'&&!videoHosts.has(url.hostname.toLowerCase()))throw new AccessError('invalid_video_url',400);
 return url.href;
}

export function productLinks(body,existing=null){
 return {
  repositoryUrl:checkedUrl(body.repositoryUrl??existing?.repositoryUrl??'','repository'),
  documentationUrl:checkedUrl(body.documentationUrl??existing?.documentationUrl??'','documentation'),
  videoUrl:checkedUrl(body.videoUrl??existing?.videoUrl??'','video')
 };
}

export const productLinkColumns=`COALESCE(l.repository_url,'') AS repositoryUrl,COALESCE(l.documentation_url,'') AS documentationUrl,COALESCE(l.video_url,'') AS videoUrl`;

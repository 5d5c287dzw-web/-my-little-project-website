// Compact prototype photos live in D1 alongside the private product records.
// Keep binary data out of workspace JSON and expose it only through scoped routes.
export const mediaSchema=`CREATE TABLE IF NOT EXISTS shop_media (
 target_type TEXT NOT NULL CHECK(target_type IN ('product','bom')),
 target_id TEXT NOT NULL,
 product_id TEXT NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
 image_data BLOB NOT NULL,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 alt_text TEXT NOT NULL DEFAULT '',
 caption TEXT NOT NULL DEFAULT '',
 is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(target_type,target_id)
)`;
export async function ensureShopMedia(db){
 await db.prepare(mediaSchema).run();
 await db.prepare('CREATE INDEX IF NOT EXISTS idx_shop_media_product ON shop_media(product_id,target_type)').run();
}
export const mediaSelect=`target_type AS targetType,target_id AS targetId,product_id AS productId,
 mime_type AS mimeType,alt_text AS altText,caption,is_public AS isPublic,updated_at AS updatedAt`;
export const imageBytes=data=>data instanceof Uint8Array?data:new Uint8Array(data);
export const imageResponse=(row,cache='no-store')=>new Response(imageBytes(row.image_data),{headers:{
 'Content-Type':row.mime_type,'Content-Length':String(row.image_data.length),
 'Cache-Control':cache,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",
 'X-Frame-Options':'DENY'
}});

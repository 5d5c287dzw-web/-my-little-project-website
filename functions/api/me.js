// Account boundary: deny by default until a verified identity provider is integrated.
// Never infer customer identity from browser-supplied email, IDs, or local storage.
// No customer, purchase, entitlement or progress records are returned here.
export async function onRequestGet() {
  return new Response(JSON.stringify({
    authenticated: false,
    error: "authentication_not_enabled"
  }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

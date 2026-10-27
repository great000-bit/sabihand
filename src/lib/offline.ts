/**
 * SITE_OFFLINE=1 (or "true") hides the whole site: every page answers with a plain 404, as if nothing were here.
 * API routes keep working so health checks and payment webhooks still land. Set it on Production only, so preview
 * deployments stay usable, and redeploy after changing it.
 */
export const siteOffline = (env: Record<string, string | undefined> = process.env) =>
  env.SITE_OFFLINE === "1" || env.SITE_OFFLINE === "true";

// The same look as the stock Next.js 404, with nothing that says whose site this is.
const NOT_FOUND_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>404: This page could not be found.</title><style>
body{margin:0;color:#000;background:#fff;font-family:system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
h1{display:inline-block;margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px;border-right:1px solid rgba(0,0,0,.3)}
h2{display:inline-block;margin:0;font-size:14px;font-weight:400;line-height:49px}
@media (prefers-color-scheme:dark){body{color:#fff;background:#000}h1{border-right-color:rgba(255,255,255,.3)}}
</style></head><body><div class="wrap"><div><h1>404</h1><h2>This page could not be found.</h2></div></div></body></html>`;

export const notFoundResponse = () =>
  new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });

/**
 * SITE_OFFLINE=1 (or "true") hides the whole site: every page answers with the 404 page below.
 * API routes keep working so health checks and payment webhooks still land. Set it on Production only, so preview
 * deployments stay usable, and redeploy after changing it.
 */
export const siteOffline = (env: Record<string, string | undefined> = process.env) =>
  env.SITE_OFFLINE === "1" || env.SITE_OFFLINE === "true";

// A night sky in the brand colours: midnight fading to the site's black, drifting clouds, a huge 404 and the gold
// hand from the logo waving where the 0 is. Self-contained (no app layout), so it costs no database or auth call.
// The logo and hand load from /brand, which the proxy never touches.
const NOT_FOUND_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<meta name="theme-color" content="#0B1F4B"><title>Page not found | Sabihand</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{min-height:100svh;display:flex;flex-direction:column;overflow-x:hidden;background:#050506;color:#f5f5f7;font-family:"Space Grotesk",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.sky{position:fixed;inset:0;z-index:0;overflow:hidden;
  background:radial-gradient(ellipse 70% 55% at 50% 0%,rgba(34,80,214,.45),transparent 70%),
    linear-gradient(180deg,#0B1F4B 0%,#0a1a3f 40%,#070b18 75%,#050506 100%)}
.sky::before{content:"";position:absolute;inset:0;opacity:.7;animation:twinkle 6s ease-in-out infinite alternate;background-image:
  radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 22% 42%,#fff,transparent),
  radial-gradient(1px 1px at 31% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 68% 9%,#fff,transparent),
  radial-gradient(1px 1px at 77% 30%,#fff,transparent),radial-gradient(1px 1px at 88% 16%,#fff,transparent),
  radial-gradient(1.5px 1.5px at 93% 44%,#fff,transparent),radial-gradient(1px 1px at 6% 58%,#fff,transparent),
  radial-gradient(1px 1px at 47% 6%,#E3A92B,transparent),radial-gradient(1px 1px at 58% 24%,#fff,transparent)}
.sky::after{content:"";position:absolute;inset:auto 0 0 0;height:45%;background:radial-gradient(ellipse 85% 70% at 50% 100%,rgba(143,176,255,.16),transparent 70%)}
.cloud{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(170,195,255,.15),rgba(170,195,255,0));filter:blur(6px);animation:drift 38s ease-in-out infinite alternate}
.c1{width:620px;height:200px;left:-180px;bottom:6%}
.c2{width:520px;height:180px;right:-140px;bottom:14%;animation-duration:46s;animation-delay:-12s}
.c3{width:420px;height:150px;right:4%;top:22%;opacity:.7;animation-duration:52s}
.c4{width:360px;height:120px;left:8%;top:30%;opacity:.5;animation-duration:44s;animation-delay:-20s}
.c5{width:900px;height:240px;left:50%;bottom:-120px;margin-left:-450px;opacity:.9;animation-duration:60s}
header{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:28px 32px}
header img{display:block;height:26px;width:auto}
.login{display:inline-flex;align-items:center;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:500;color:#f5f5f7;text-decoration:none;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12);transition:background .2s}
.login:hover{background:rgba(255,255,255,.14)}
main{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 16px 72px}
.art{position:relative;display:flex;justify-content:center;user-select:none}
.num{font-size:clamp(170px,36vw,470px);font-weight:700;line-height:.8;letter-spacing:-.06em;padding-right:.06em;
  color:transparent;background:linear-gradient(180deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.55) 55%,rgba(255,255,255,0) 96%);
  -webkit-background-clip:text;background-clip:text}
.hero{position:absolute;left:50%;bottom:0;height:92%;aspect-ratio:371/485;transform:translateX(-50%)}
.glow{position:absolute;inset:-10% -40%;border-radius:50%;background:radial-gradient(closest-side,rgba(227,169,43,.2),rgba(227,169,43,0));filter:blur(4px);animation:pulse 4s ease-in-out infinite alternate}
.hand{position:relative;display:block;height:100%;width:auto;transform-origin:55% 92%;filter:drop-shadow(0 14px 22px rgba(5,5,6,.35));animation:wave 2.6s ease-in-out infinite}
.shadow{position:absolute;left:50%;bottom:-5%;width:90%;height:12%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),transparent);animation:shade 2.6s ease-in-out infinite}
h1{margin:.2em 0 0;font-size:clamp(32px,5.2vw,56px);font-weight:700;letter-spacing:-.025em;line-height:1.05;text-shadow:0 2px 24px rgba(5,5,6,.6)}
p{margin:12px 0 0;font-size:clamp(16px,1.6vw,20px);color:#babcc6}
.back{display:inline-flex;align-items:center;gap:6px;margin-top:28px;padding:12px 18px 12px 14px;border-radius:12px;background:#2250D6;color:#fff;
  font-size:15px;font-weight:500;text-decoration:none;box-shadow:0 10px 30px rgba(34,80,214,.45),inset 0 1px 0 rgba(255,255,255,.22);transition:transform .2s,background .2s}
.back:hover{background:#2c5ce6;transform:translateY(-1px)}
.back svg{width:16px;height:16px}
a:focus-visible{outline:2px solid #E3A92B;outline-offset:3px}
@keyframes wave{0%,100%{transform:rotate(-7deg) translateY(0)}50%{transform:rotate(7deg) translateY(-6px)}}
@keyframes shade{0%,100%{opacity:1;width:90%}50%{opacity:.7;width:78%}}
@keyframes pulse{to{opacity:.6;transform:scale(.92)}}
@keyframes drift{to{transform:translateX(70px)}}
@keyframes twinkle{to{opacity:.35}}
@media (max-width:640px){header{padding:20px 16px}header img{height:22px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body>
<div class="sky" aria-hidden="true"><div class="cloud c1"></div><div class="cloud c2"></div><div class="cloud c3"></div><div class="cloud c4"></div><div class="cloud c5"></div></div>
<header><a href="/" aria-label="Sabihand home"><img src="/brand/wordmark-on-midnight.svg" alt="Sabihand" width="137" height="20"></a><a class="login" href="/auth/sign-in">Log in</a></header>
<main>
<div class="art" aria-hidden="true"><div class="num">404</div><div class="hero"><div class="glow"></div><div class="shadow"></div><img class="hand" src="/brand/hand-gold.svg" alt=""></div></div>
<h1>Oops! I think we’re lost</h1>
<p>Let’s get you back to somewhere familiar</p>
<a class="back" href="/"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Back to home</a>
</main>
</body></html>`;

export const notFoundResponse = () =>
  new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });

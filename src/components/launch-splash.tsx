import { GLYPHS } from "./splash-glyphs";

const KEY = "sabihand-opened";

/**
 * The opening screen: every time someone opens Sabihand (a new tab, or launching it from the home screen), the full
 * logo is drawn in, then the screen fades away by itself. It is drawn with the page and hidden before the first paint
 * when this tab already saw it, so it never flashes. Pure CSS after that: no script has to load for it to leave.
 * Not shown on /continue, which has its own sign-in screen with the same logo.
 */
export function LaunchSplash() {
  const skip = `try{var e=document.getElementById("launch");if(sessionStorage.getItem("${KEY}")||location.pathname.indexOf("/continue")===0||matchMedia("(prefers-reduced-motion: reduce)").matches){e.hidden=true}else{sessionStorage.setItem("${KEY}","1")}}catch(_){document.getElementById("launch").hidden=true}`;
  return (
    <>
      <div id="launch" className="splash launch" aria-hidden suppressHydrationWarning>
        <svg className="splash-logo" viewBox="-10 -810 5751.3 820">
          {GLYPHS.map((g, i) => (
            <path
              key={g.n}
              className="splash-glyph"
              d={g.d}
              transform={g.transform}
              pathLength={1}
              fillRule={g.evenodd ? "evenodd" : undefined}
              style={{ ["--i" as string]: i, ["--stroke" as string]: g.stroke, ["--fill" as string]: g.fill }}
            />
          ))}
        </svg>
      </div>
      <script dangerouslySetInnerHTML={{ __html: skip }} />
    </>
  );
}

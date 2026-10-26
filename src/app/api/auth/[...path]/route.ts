import { authConfigured, getAuth } from "@/lib/auth/server";

const off = () => new Response("Sign-in is not set up in this environment", { status: 503 });

type Ctx = { params: Promise<{ path: string[] }> };

/** Passes the request to the auth service. If that throws, answer with a clear 503 and log it, instead of an opaque 500. */
async function pass(method: "GET" | "POST", req: Request, ctx: Ctx) {
  if (!authConfigured) return off();
  try {
    return await getAuth().handler()[method](req, ctx);
  } catch (e) {
    console.error(`auth ${method} ${new URL(req.url).pathname} failed`, e);
    return Response.json({ message: "Sign-in is not responding. Please try again." }, { status: 503 });
  }
}

export const GET = (req: Request, ctx: Ctx) => pass("GET", req, ctx);
export const POST = (req: Request, ctx: Ctx) => pass("POST", req, ctx);

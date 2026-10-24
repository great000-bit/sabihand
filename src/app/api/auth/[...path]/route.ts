import { authConfigured, getAuth } from "@/lib/auth/server";

const off = () => new Response("Sign-in is not set up in this environment", { status: 503 });

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return authConfigured ? getAuth().handler().GET(req, ctx) : off();
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return authConfigured ? getAuth().handler().POST(req, ctx) : off();
}

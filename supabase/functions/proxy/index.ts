import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const allowedPathsRaw = Deno.env.get("TARGET_PROXY_PATHES") || "";
const allowedPaths = allowedPathsRaw.split(",").map((p) => p.trim());

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, x-myko-auth',
  }
}

export default {
  fetch: withSupabase({
    auth: ['none'],
    cors: false,
  }, async (req: Request): Promise<Response> => {

    const origin = req.headers.get('origin')
    const cors = corsHeaders(origin)

    const respond = (body: BodyInit | null, init: ResponseInit): Response => {
      const headers = new Headers(init.headers)
      for (const [k, v] of Object.entries(cors)) headers.set(k, v)
      return new Response(body, { ...init, headers })
    }

    if (req.method === 'OPTIONS') {
      return respond(null, { status: 204 })
    }

    const mykoSecret = Deno.env.get('MYKO_SECRET')
    if (!mykoSecret) {
      return respond("MYKO_SECRET env var is not set", { status: 500 })
    }
    const mykoAuthHeader = req.headers.get('x-myko-auth');
    const mykoAuthed = !!mykoSecret && mykoSecret == mykoAuthHeader;

    if (!mykoAuthed) {
      return respond("MYKO_SECRET doesn't match", { status: 401 })
    }


    const targetBase = Deno.env.get("TARGET_PROXY");
    if (!targetBase) {
      return respond("TARGET_PROXY env var is not set", { status: 500 })
    }

    const url = new URL(req.url);
    const functionPrefix = new URL(url).pathname.replace(/\/proxy\/.*$/, "/proxy/");
    const subPath = url.pathname.slice(functionPrefix.length);

    if (!allowedPaths.some((prefix) => subPath === prefix || subPath.startsWith(prefix + "/") || subPath.startsWith(prefix + "?"))) {
      return respond(JSON.stringify({message: "Path not allowed", subPath}), { status: 403, headers: { "content-type": "application/json" } })
    }
    const targetUrl = new URL(subPath + url.search, targetBase);

    const headers = new Headers();
    const cookie = req.headers.get("cookie");
    if (cookie) {
      headers.set("cookie", cookie);
    }

    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.body;
    }

    try {
      const resp = await fetch(targetUrl.toString(), init);

      const respHeaders = new Headers();
      for (const [key, value] of resp.headers) {
        if (key.toLowerCase() === "set-cookie") {
          const rewritten = value.replace(
            /Path=(.*);/i,
            (_, path) => `Path=/; SameSite=None; Secure; `, //Domain=supabase.co;
          ).replace('SameSite=Strict;', '')
          ;
          //const evenMoreRewritten = rewritten.replace('SameSite=Strict', 'SameSite=None; Secure; Domain=supabase.co')
          respHeaders.append("set-cookie", rewritten);
        }
      }

      return respond(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      })
    } catch (err) {
      return respond(
        JSON.stringify({ error: "Proxy request failed", detail: String(err) }),
        { status: 502, headers: { "content-type": "application/json" } },
      )
    }
  }),
};

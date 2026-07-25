import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const allowedPathsRaw = Deno.env.get("TARGET_PROXY_PATHES") || "";
const allowedPaths = allowedPathsRaw.split(",").map((p) => p.trim());

export default {
  fetch: withSupabase({
    auth: ['none'],
    cors: {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, x-myko-auth',
      },
    },
  }, async (req: Request): Promise<Response> => {

    const mykoSecret = Deno.env.get('MYKO_SECRET')
    if (!mykoSecret) {
      return new Response("MYKO_SECRET env var is not set", { status: 500 });
    }
    const mykoAuthHeader = req.headers.get('x-myko-auth');
    const mykoAuthed = !!mykoSecret && mykoSecret == mykoAuthHeader;

    if (!mykoAuthed) {
      return new Response("MYKO_SECRET doesn't match", { status: 401 });
    }


    const targetBase = Deno.env.get("TARGET_PROXY");
    if (!targetBase) {
      return new Response("TARGET_PROXY env var is not set", { status: 500 });
    }

    const url = new URL(req.url);
    const functionPrefix = new URL(url).pathname.replace(/\/proxy\/.*$/, "/proxy/");
    const subPath = url.pathname.slice(functionPrefix.length);

    if (!allowedPaths.some((prefix) => subPath === prefix || subPath.startsWith(prefix + "/") || subPath.startsWith(prefix + "?"))) {
      return Response.json({message: "Path not allowed", subPath}, { status: 403 });
    }
    const targetUrl = new URL(subPath + url.search, targetBase);

    const headers = new Headers();
    const cookie = req.headers.get("cookie");
    if (cookie) {
      headers.set("cookie", cookie);
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
      const cookiePath = url.pathname;
      for (const [key, value] of resp.headers) {
        if (key.toLowerCase() === "set-cookie") {
          const rewritten = value.replace(
            /Path=\/\.netlify\/functions\/auth-refresh/i,
            `Path=${cookiePath}`,
          );
          respHeaders.append("set-cookie", rewritten);
        }
      }

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Proxy request failed", detail: String(err) }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
  }),
};

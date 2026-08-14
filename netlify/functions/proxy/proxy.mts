import { Context } from '@netlify/functions'

const respond = (body: BodyInit | null, init: ResponseInit): Response => {
  return new Response(body, { ...init });
};

// Hop-by-hop headers that must not be relayed back to the client as-is.
const SKIP_RESPONSE_HEADERS = new Set([
  "content-encoding", // fetch already decodes the body
  "content-length", // may no longer match the decoded body
  "transfer-encoding",
  "connection",
]);



export default async (request: Request, context: Context) => {
  try {
    const mykoSecret = process.env.MYKO_SECRET;
    if (!mykoSecret) {
      return respond("MYKO_SECRET env var is not set", { status: 500 });
    }
    if (request.headers.get("x-myko-auth") !== mykoSecret) {
      return respond("MYKO_SECRET doesn't match", { status: 401 });
    }

    const targetBase = process.env.TARGET_PROXY;
    if (!targetBase) {
      return respond("TARGET_PROXY env var is not set", { status: 500 });
    }

    if (request.method === "OPTIONS") {
      return respond(null, { status: 204 });
    }    

    const url = new URL(request.url)
    const relativePath = url.pathname.replace("/.netlify/functions/proxy/", "/")

    const targetPathesAllowed = new Set((process.env.TARGET_PROXY_PATHES || '').split(",").map(p => p.trim()));
    if (!targetPathesAllowed.has(relativePath)) {
      return respond(`path ${relativePath} is not allowed`, { status: 500 });
    }

    const targetUrl = new URL(relativePath + url.search, targetBase);


    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      //init.duplex = "half"; // required by undici when streaming a request body
    }



    try {
    const resp = await fetch(targetUrl, init);

    const respHeaders = new Headers();
    for (const [key, value] of resp.headers) {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        respHeaders.set(key, value);
      }
    }

    return respond(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    return respond(
      JSON.stringify({ error: "Proxy request failed", detail: String(err) }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  } catch (error) {
    return new Response(error.toString(), {
      status: 500,
    })
  }
}

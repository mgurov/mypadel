const allowedPathsRaw = process.env.TARGET_SUN_PROXY_PATHES || "";
const allowedPaths = allowedPathsRaw.split(",").map((p) => p.trim());

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, x-myko-auth, m_access_token, m_refresh_token',
    'Access-Control-Expose-Headers': 'm_access_token, m_refresh_token',
  }
}

const respond = (cors: Record<string, string>) => (body: BodyInit | null, init: ResponseInit): Response => {
  const headers = new Headers(init.headers)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(body, { ...init, headers })
}

export default async (request: Request) => {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)
  const respondWith = respond(cors)

  if (request.method === 'OPTIONS') {
    return respondWith(null, { status: 204 })
  }

  const mykoSecret = process.env.MYKO_SECRET
  if (!mykoSecret) {
    return respondWith("MYKO_SECRET env var is not set", { status: 500 })
  }
  const mykoAuthHeader = request.headers.get('x-myko-auth');
  const mykoAuthed = !!mykoSecret && mykoSecret == mykoAuthHeader;

  if (!mykoAuthed) {
    return respondWith("MYKO_SECRET doesn't match", { status: 401 })
  }

  const targetBase = process.env.TARGET_SUN_PROXY;
  if (!targetBase) {
    return respondWith("TARGET_SUN_PROXY env var is not set", { status: 500 })
  }

  const url = new URL(request.url);
  const functionPrefix = "/.netlify/functions/sunset-proxy/";
  const subPath = url.pathname.slice(functionPrefix.length);

  if (!allowedPaths.some((prefix) => subPath === prefix || subPath.startsWith(prefix + "/") || subPath.startsWith(prefix + "?"))) {
    return respondWith(JSON.stringify({ message: "Path not allowed", subPath }), { status: 403, headers: { "content-type": "application/json" } })
  }
  const targetUrl = new URL(subPath + url.search, targetBase);

  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (key !== "m_access_token") {
      continue;
    }
    headers.append('cookie', value)
  }

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
    init.duplex = "half"; // required by undici when streaming a request body
  }

  try {
    const resp = await fetch(targetUrl.toString(), init);

    const respHeaders = new Array<[string, string]>();
    for (const [key, value] of resp.headers) {
      if (key.toLowerCase() === "set-cookie") {
        if (value.startsWith("access_token=")) {
          respHeaders.push(["m_access_token", value]);
        } else if (value.startsWith("refresh_token=")) {
          respHeaders.push(["m_refresh_token", value]);
        }
      } else {
        respHeaders.push([key, value]);
      }
    }

    return respondWith(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    })
  } catch (err) {
    return respondWith(
      JSON.stringify({ error: "Proxy request failed", detail: String(err) }),
      { status: 502, headers: { "content-type": "application/json" } },
    )
  }
}

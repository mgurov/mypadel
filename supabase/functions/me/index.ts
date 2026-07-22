// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

//console.log("Hello from Functions!");

// This endpoint uses 'publishable' | 'secret' access, apiKey is required.
// Use publishable for Client-facing, key-validated endpoints
// Use secret for Server-to-server, internal calls
export default {
  fetch: withSupabase({ auth: ["publishable", "secret", "none"] }, async (req, ctx) => {
    // Called by another service with a secret key
    // ctx.supabaseAdmin bypasses RLS — use for privileged operations
    /*
    if (ctx.authMode === "secret") {
      const { user_id } = await req.json();
      const { data } = await ctx.supabaseAdmin.auth.admin.getUserById(user_id);

      return Response.json({
        email: data?.user?.email,
      });
    }
    */

    if (ctx.authMode === "none") {

      const mykoSecret = Deno.env.get('MYKO_SECRET')
      const mykoAuthHeader = req.headers.get('x-myko-auth');
      const mykoAuthed = !!mykoSecret && mykoSecret == mykoAuthHeader;

      return Response.json({
      message: `Hello, none auth!`,
      mykoAuthHeader,
      mykoAuthed,
      env: {
        url: req.url,
        method: req.method,
      }
    });
    }
    
    return Response.json({
      message: `Hello, std auth!`,
      env: {
        TARGET_PROXY: Deno.env.get('TARGET_PROXY', 'no_TARGET_PROXY'),
        url: req.url,
        method: req.method,
      }
    });
  }),
};
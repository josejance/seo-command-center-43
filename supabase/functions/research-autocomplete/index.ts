import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { keyword, location_name, language_name } = await req.json();

    const login = Deno.env.get("DATAFORSEO_LOGIN")!;
    const password = Deno.env.get("DATAFORSEO_PASSWORD")!;
    const credentials = btoa(`${login}:${password}`);

    const response = await fetch(
      "https://api.dataforseo.com/v3/serp/google/autocomplete/live/advanced",
      {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
        body: JSON.stringify([{
          keyword,
          location_name: location_name || "Brazil",
          language_name: language_name || "Portuguese",
          client: "gws-wiz-serp",
        }]),
      }
    );

    const rawResponse = await response.json();
    if (rawResponse.status_code !== 20000) {
      return new Response(
        JSON.stringify({ error: rawResponse.status_message || "API error", raw_response: rawResponse }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const task = rawResponse.tasks?.[0];
    const items = task?.result?.[0]?.items || [];

    const suggestions = items.map((item: any) => ({
      keyword: item.suggestion || item.title,
      source_type: "autocomplete",
    })).filter((s: any) => s.keyword);

    return new Response(
      JSON.stringify({ keywords: suggestions, raw_response: rawResponse, cost: task?.cost || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

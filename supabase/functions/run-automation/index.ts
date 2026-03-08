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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { action, project_id, keywords, webhook_url, webhook_event, webhook_payload } = await req.json();

    // Action: send_webhook
    if (action === "send_webhook") {
      if (!webhook_url) {
        return new Response(JSON.stringify({ error: "webhook_url required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const res = await fetch(webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: webhook_event || "manual_trigger",
            project_id,
            timestamp: new Date().toISOString(),
            ...webhook_payload,
          }),
        });

        const responseText = await res.text();
        return new Response(
          JSON.stringify({ success: res.ok, status: res.status, response: responseText }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: bulk_research — process keywords with rate limiting
    if (action === "bulk_research") {
      if (!project_id || !keywords || !Array.isArray(keywords)) {
        return new Response(JSON.stringify({ error: "project_id and keywords array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: project } = await supabase
        .from("projects")
        .select("target_location, target_language")
        .eq("id", project_id)
        .single();

      const login = Deno.env.get("DATAFORSEO_LOGIN")!;
      const password = Deno.env.get("DATAFORSEO_PASSWORD")!;
      const credentials = btoa(`${login}:${password}`);

      const results: any[] = [];
      let totalCost = 0;

      // Process in batches of 3 with 1s delay between batches
      for (let i = 0; i < keywords.length; i += 3) {
        const batch = keywords.slice(i, i + 3);

        for (const kw of batch) {
          try {
            // Insert keyword if not exists
            const { data: existingKw } = await supabase
              .from("keywords")
              .select("id")
              .eq("project_id", project_id)
              .eq("keyword", kw)
              .single();

            let keywordId = existingKw?.id;
            if (!keywordId) {
              const { data: newKw } = await supabase
                .from("keywords")
                .insert({ project_id, keyword: kw, source_type: "main" })
                .select("id")
                .single();
              keywordId = newKw?.id;
            }

            // Call SERP API
            const response = await fetch(
              "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${credentials}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify([{
                  keyword: kw,
                  location_name: project?.target_location || "Brazil",
                  language_name: project?.target_language || "Portuguese",
                  depth: 10,
                }]),
              }
            );

            const raw = await response.json();
            const task = raw.tasks?.[0];
            const cost = task?.cost || 0;
            totalCost += cost;

            results.push({
              keyword: kw,
              keyword_id: keywordId,
              status: raw.status_code === 20000 ? "success" : "error",
              cost,
              results_count: task?.result?.[0]?.items?.length || 0,
            });

            // Save history
            if (keywordId) {
              await supabase.from("research_history").insert({
                project_id,
                keyword_id: keywordId,
                api_endpoint: "serp/google/organic/live/advanced",
                cost_credits: cost,
                raw_response: raw,
              });
            }
          } catch (err) {
            results.push({ keyword: kw, status: "error", error: err.message });
          }
        }

        // Rate limit: wait 1 second between batches
        if (i + 3 < keywords.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Log automation
      await supabase.from("automation_logs").insert({
        project_id,
        action: "bulk_research",
        status: "completed",
        details: { total_keywords: keywords.length, total_cost: totalCost, results },
      });

      return new Response(
        JSON.stringify({ results, total_cost: totalCost }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: bulk_research, send_webhook" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

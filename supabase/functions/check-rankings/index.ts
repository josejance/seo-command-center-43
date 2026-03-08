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
    const { project_id, target_domain } = await req.json();

    if (!project_id || !target_domain) {
      return new Response(JSON.stringify({ error: "project_id and target_domain are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get monitored keywords for this project
    const { data: keywords, error: kwError } = await supabase
      .from("keywords")
      .select("id, keyword, search_volume")
      .eq("project_id", project_id)
      .eq("monitored", true);

    if (kwError) throw kwError;
    if (!keywords || keywords.length === 0) {
      return new Response(JSON.stringify({ error: "No monitored keywords found", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project info for location/language
    const { data: project } = await supabase
      .from("projects")
      .select("target_location, target_language")
      .eq("id", project_id)
      .single();

    const login = Deno.env.get("DATAFORSEO_LOGIN")!;
    const password = Deno.env.get("DATAFORSEO_PASSWORD")!;
    const credentials = btoa(`${login}:${password}`);

    const results: any[] = [];
    const alerts: any[] = [];
    const domain = target_domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();

    // Process keywords in batches of 5
    for (let i = 0; i < keywords.length; i += 5) {
      const batch = keywords.slice(i, i + 5);
      const tasks = batch.map((kw) => ({
        keyword: kw.keyword,
        location_name: project?.target_location || "Brazil",
        language_name: project?.target_language || "Portuguese",
        depth: 100,
      }));

      const response = await fetch(
        "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tasks),
        }
      );

      const rawResponse = await response.json();

      if (rawResponse.status_code !== 20000) continue;

      for (let j = 0; j < batch.length; j++) {
        const kw = batch[j];
        const task = rawResponse.tasks?.[j];
        const items = task?.result?.[0]?.items || [];

        // Find the target domain in results
        let foundPosition: number | null = null;
        let foundUrl: string | null = null;

        for (const item of items) {
          if (item.type === "organic" && item.domain?.toLowerCase().includes(domain)) {
            foundPosition = item.rank_absolute;
            foundUrl = item.url;
            break;
          }
        }

        // Save to rank_history
        const { error: insertError } = await supabase.from("rank_history").insert({
          keyword_id: kw.id,
          position: foundPosition,
          url: foundUrl,
          domain: foundPosition ? domain : null,
        });

        if (insertError) console.error("Insert error:", insertError);

        // Check previous position for alerts
        const { data: prevRanks } = await supabase
          .from("rank_history")
          .select("position")
          .eq("keyword_id", kw.id)
          .order("checked_at", { ascending: false })
          .limit(2);

        if (prevRanks && prevRanks.length >= 2) {
          const current = prevRanks[0].position;
          const previous = prevRanks[1].position;

          if (current !== null && previous !== null) {
            const diff = previous - current; // positive = improved
            if (Math.abs(diff) >= 5) {
              const alertType = diff > 0 ? "rank_improvement" : "rank_drop";
              const severity = Math.abs(diff) >= 10 ? "high" : "medium";
              const message = diff > 0
                ? `"${kw.keyword}" subiu ${diff} posições (${previous}→${current})`
                : `"${kw.keyword}" caiu ${Math.abs(diff)} posições (${previous}→${current})`;

              await supabase.from("alerts").insert({
                project_id,
                type: alertType,
                message,
                keyword_id: kw.id,
                severity,
              });

              alerts.push({ keyword: kw.keyword, type: alertType, diff, message });
            }
          }
        }

        results.push({
          keyword_id: kw.id,
          keyword: kw.keyword,
          position: foundPosition,
          url: foundUrl,
          cost: task?.cost || 0,
        });
      }
    }

    // Save research history
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
    await supabase.from("research_history").insert({
      project_id,
      api_endpoint: "serp/google/organic/live/regular",
      cost_credits: totalCost,
      raw_response: { results, alerts },
    });

    return new Response(
      JSON.stringify({ results, alerts, total_cost: totalCost }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

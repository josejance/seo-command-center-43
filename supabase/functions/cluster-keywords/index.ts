import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getSelectedModel(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("user_id", userId)
    .eq("setting_key", "ai_model")
    .single();
  return data?.setting_value || "openai/gpt-4o-mini";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const userId = claimsData.claims.sub;
    const { project_id, keywords } = await req.json();
    if (!project_id || !keywords?.length) {
      return new Response(JSON.stringify({ error: "project_id and keywords are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const model = await getSelectedModel(supabase, userId);

    // Process in batches of 50
    const batchSize = 50;
    const allClusters: Array<{ name: string; intent: string; keywords: string[] }> = [];

    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);
      const keywordList = batch.map((k: { keyword: string }) => k.keyword).join("\n- ");

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `Você é um especialista em SEO. Agrupe keywords em clusters temáticos.
Responda APENAS com JSON válido no formato: { "clusters": [{ "name": "string", "intent": "informational|commercial|transactional|navigational", "keywords": ["string"] }] }`
            },
            {
              role: "user",
              content: `Agrupe estas keywords de SEO em clusters temáticos. Para cada cluster, dê um nome descritivo em português e classifique a intenção predominante (informational, commercial, transactional ou navigational).

Keywords:
- ${keywordList}

Retorne APENAS JSON válido.`
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes na OpenRouter." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("OpenRouter error:", response.status, t);
        throw new Error("OpenRouter error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      try {
        // Try to parse JSON from content (may be wrapped in markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.clusters) allClusters.push(...parsed.clusters);
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e, content);
      }
    }

    // Map keyword names to IDs
    const keywordMap = new Map<string, string>();
    keywords.forEach((k: { id: string; keyword: string }) => {
      keywordMap.set(k.keyword.toLowerCase(), k.id);
    });

    // Delete existing clusters for this project
    await supabase.from("keyword_clusters").delete().eq("project_id", project_id);

    // Save clusters
    const clusterRows = allClusters.map(c => ({
      project_id,
      name: c.name,
      intent: c.intent,
      keyword_ids: c.keywords
        .map(kw => keywordMap.get(kw.toLowerCase()))
        .filter(Boolean),
    }));

    if (clusterRows.length > 0) {
      const { error: insertError } = await supabase.from("keyword_clusters").insert(clusterRows);
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(insertError.message);
      }
    }

    return new Response(JSON.stringify({ clusters: clusterRows, count: clusterRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("cluster-keywords error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

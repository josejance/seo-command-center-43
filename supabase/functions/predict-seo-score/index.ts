const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, search_volume, keyword_difficulty, search_intent, serp_results, domain } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Analise a keyword "${keyword}" e preveja a probabilidade de um site ranquear para ela.

Dados:
- Volume: ${search_volume ?? 'N/A'}
- Dificuldade: ${keyword_difficulty ?? 'N/A'}%
- Intenção: ${search_intent ?? 'N/A'}
- Domínio alvo: ${domain || 'não informado'}
- Top 10 SERP: ${serp_results?.map((r: any, i: number) => `${i+1}. ${r.title} (${r.domain})`).join('\n') || 'N/A'}

Analise:
1. O tipo de conteúdo que domina (artigos longos, listas, vídeos, etc.)
2. A autoridade dos domínios no top 10
3. Presença de SERP features (featured snippets, PAA, vídeos)
4. Oportunidades de gap (o que falta nos resultados atuais)
5. Nível de autoridade necessário para competir

Responda APENAS com JSON:
{
  "ranking_probability": number (0-100),
  "difficulty_assessment": "easy|moderate|hard|very_hard",
  "dominant_content_type": "string",
  "authority_required": "low|medium|high|very_high",
  "serp_features": ["string"],
  "opportunities": ["string"],
  "estimated_time_to_rank": "string",
  "recommendation": "string",
  "factors": [
    { "factor": "string", "impact": "positive|neutral|negative", "detail": "string" }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um analista SEO expert. Forneça previsões precisas baseadas em dados reais da SERP. Responda apenas com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    let prediction;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) prediction = JSON.parse(match[0]);
      else throw new Error("No JSON");
    } catch {
      prediction = { ranking_probability: 50, difficulty_assessment: "moderate", recommendation: content };
    }

    return new Response(JSON.stringify({ prediction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("predict-seo-score error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

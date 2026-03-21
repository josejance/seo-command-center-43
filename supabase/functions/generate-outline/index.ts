const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, search_volume, keyword_difficulty, search_intent, secondary_keywords, paa_questions, subtopics, serp_results } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em SEO e marketing de conteúdo para o mercado brasileiro. Crie outlines de artigos otimizados para ranquear no Google. Responda APENAS com JSON válido.`
          },
          {
            role: "user",
            content: `Crie um outline detalhado para um artigo sobre "${keyword}".
Volume de busca: ${search_volume ?? 'N/A'}.
Dificuldade: ${keyword_difficulty ?? 'N/A'}.
Intenção: ${search_intent ?? 'N/A'}.
Keywords secundárias para incluir: ${secondary_keywords?.join(', ') || 'nenhuma'}.
Perguntas que as pessoas fazem (PAA): ${paa_questions?.join('; ') || 'nenhuma'}.
Subtópicos identificados: ${subtopics?.join(', ') || 'nenhum'}.
Os top 5 resultados do Google são: ${serp_results?.map((r: any, i: number) => `${i+1}. ${r.title} - ${r.description}`).join('\n') || 'N/A'}.

O outline deve:
1) Ter H1, H2s e H3s claramente definidos.
2) Incluir seções que respondam às PAA.
3) Incorporar as keywords secundárias naturalmente.
4) Sugerir onde adicionar elementos de engajamento (listas, tabelas, FAQs, CTAs).
5) Estimar comprimento ideal do artigo.

Retorne em formato JSON:
{
  "title": "string",
  "meta_description": "string",
  "h1": "string",
  "sections": [
    {
      "heading": "string",
      "level": "h2 ou h3",
      "talking_points": ["string"],
      "target_keywords": ["string"],
      "suggested_elements": ["string"]
    }
  ],
  "estimated_word_count": number,
  "content_type": "string"
}`
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    let outline;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) outline = JSON.parse(jsonMatch[0]);
      else throw new Error("No JSON found");
    } catch {
      outline = { title: keyword, meta_description: "", h1: keyword, sections: [], estimated_word_count: 1500, content_type: "article", raw: content };
    }

    return new Response(JSON.stringify({ outline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-outline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

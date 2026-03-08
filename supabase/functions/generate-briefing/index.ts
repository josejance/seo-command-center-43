const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, search_volume, keyword_difficulty, search_intent, secondary_keywords, paa_questions, outline, serp_results } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Crie um briefing completo para um redator freelancer escrever um artigo sobre "${keyword}".

Dados disponíveis:
- Volume de busca: ${search_volume ?? 'N/A'}
- Dificuldade: ${keyword_difficulty ?? 'N/A'}
- Intenção de busca: ${search_intent ?? 'N/A'}
- Keywords secundárias: ${secondary_keywords?.join(', ') || 'nenhuma'}
- Perguntas PAA: ${paa_questions?.join('; ') || 'nenhuma'}
- Outline existente: ${outline ? JSON.stringify(outline) : 'nenhum'}
- Top resultados SERP: ${serp_results?.map((r: any) => r.title).join(', ') || 'N/A'}

O briefing deve conter:
1. **Objetivo do Conteúdo**: O que o artigo deve alcançar
2. **Keyword Principal e Secundárias**: Lista completa com volumes
3. **Outline Sugerido**: Estrutura H1/H2/H3
4. **Perguntas PAA para Responder**: Cada uma com orientação
5. **Competidores a Superar**: Análise dos top resultados
6. **Tom Recomendado**: Baseado na intenção de busca
7. **Comprimento Ideal**: Em palavras, baseado na SERP
8. **Elementos Obrigatórios**: Listas, tabelas, CTAs, imagens
9. **SEO Técnico**: Meta title, meta description, URL slug sugeridos

Formate como um documento completo em Markdown, pronto para enviar a um redator.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um estrategista de conteúdo SEO experiente. Crie briefings detalhados e profissionais em Markdown." },
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
    const briefing = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-briefing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

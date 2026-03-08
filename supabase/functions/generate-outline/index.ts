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
    const { keyword, search_volume, keyword_difficulty, search_intent, secondary_keywords, paa_questions, subtopics, serp_results } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const model = await getSelectedModel(supabase, userId);

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente." }), {
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

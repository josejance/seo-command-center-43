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
    const { outline, keyword, tone, word_count } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const model = await getSelectedModel(supabase, userId);

    const outlineText = outline.sections?.map((s: any) =>
      `${s.level === 'h2' ? '##' : '###'} ${s.heading}\n${s.talking_points?.map((p: string) => `- ${p}`).join('\n') || ''}`
    ).join('\n\n') || '';

    const toneMap: Record<string, string> = {
      professional: 'profissional e autoritativo',
      conversational: 'conversacional e amigável',
      academic: 'acadêmico e detalhado',
      journalistic: 'jornalístico e objetivo',
      storytelling: 'narrativo com storytelling',
    };

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
            content: `Você é um redator de conteúdo SEO expert para o mercado brasileiro. Escreva artigos completos, bem estruturados e otimizados para mecanismos de busca.`
          },
          {
            role: "user",
            content: `Com base neste outline, escreva o artigo completo em português do Brasil.

Título: ${outline.title || keyword}
H1: ${outline.h1 || keyword}

Outline:
${outlineText}

Use tom ${toneMap[tone] || 'profissional e autoritativo'}.
Incorpore as keywords naturalmente sem forçar.
Use parágrafos curtos, listas quando apropriado e linguagem acessível.
Inclua exemplos práticos.
O artigo deve ter aproximadamente ${word_count || 1500} palavras.

Formate com Markdown (## para H2, ### para H3, **negrito**, listas com - etc).
NÃO inclua o título H1 no início, comece direto com a introdução.`
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
    const draft = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-draft error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

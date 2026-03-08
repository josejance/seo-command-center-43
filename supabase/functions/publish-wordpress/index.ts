import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content_piece_id, title, content, status: wpStatus } = await req.json();

    // Get WordPress settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .eq('user_id', user.id)
      .in('setting_key', ['wordpress_url', 'wordpress_username', 'wordpress_app_password']);

    const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.setting_key, s.setting_value]));
    const wpUrl = settingsMap.wordpress_url;
    const wpUser = settingsMap.wordpress_username;
    const wpPass = settingsMap.wordpress_app_password;

    if (!wpUrl || !wpUser || !wpPass) {
      return new Response(JSON.stringify({ error: "WordPress não configurado. Vá em Configurações > WordPress." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if content_piece already has a wordpress_post_id
    let existingPostId: string | null = null;
    if (content_piece_id) {
      const { data: cpSettings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('user_id', user.id)
        .eq('setting_key', `wp_post_id_${content_piece_id}`)
        .single();
      existingPostId = cpSettings?.setting_value ?? null;
    }

    const endpoint = existingPostId
      ? `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts/${existingPostId}`
      : `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

    const method = existingPostId ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': 'Basic ' + btoa(`${wpUser}:${wpPass}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        status: wpStatus || 'draft',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error [${response.status}]: ${errorText}`);
    }

    const wpPost = await response.json();

    // Save the WordPress post ID
    if (content_piece_id && wpPost.id) {
      await supabase.from('app_settings').upsert({
        user_id: user.id,
        setting_key: `wp_post_id_${content_piece_id}`,
        setting_value: String(wpPost.id),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,setting_key' });
    }

    return new Response(JSON.stringify({
      success: true,
      post_id: wpPost.id,
      post_url: wpPost.link,
      status: wpPost.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("publish-wordpress error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

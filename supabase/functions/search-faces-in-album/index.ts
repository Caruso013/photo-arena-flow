// Edge Function: busca fotos por embedding facial dentro de um álbum/evento.
// Recebe um embedding 128-D (gerado no navegador via face-api.js) e devolve
// as fotos mais parecidas, sem armazenar a selfie.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SearchRequest {
  embedding: number[];
  campaign_id?: string | null;
  sub_event_id?: string | null;
  threshold?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as SearchRequest;
    const {
      embedding,
      campaign_id = null,
      sub_event_id = null,
      threshold = 0.55,
      limit = 100,
    } = body;

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return new Response(
        JSON.stringify({ error: "embedding deve ser um array de 128 números" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!campaign_id && !sub_event_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id ou sub_event_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // pgvector aceita string literal '[1,2,3]'
    const vectorLiteral = `[${embedding.map((n) => Number(n).toFixed(6)).join(",")}]`;

    const { data: matches, error } = await admin.rpc("match_faces_in_album", {
      p_sub_event_id: sub_event_id,
      p_campaign_id: campaign_id,
      p_embedding: vectorLiteral,
      p_threshold: threshold,
      p_limit: limit,
    });

    if (error) {
      console.error("RPC error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplica por photo_id mantendo a maior similaridade e filtra pelo threshold
    const byPhoto = new Map<string, number>();
    for (const m of matches ?? []) {
      const prev = byPhoto.get(m.photo_id) ?? 0;
      if (m.similarity > prev) byPhoto.set(m.photo_id, m.similarity);
    }
    const filtered = Array.from(byPhoto.entries())
      .filter(([, s]) => s >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const photoIds = filtered.map(([id]) => id);

    let photos: Array<Record<string, unknown>> = [];
    if (photoIds.length > 0) {
      const { data: photoData } = await admin
        .from("photos")
        .select("id, watermarked_url, thumbnail_url, original_url, campaign_id, sub_event_id, price, is_available")
        .in("id", photoIds)
        .eq("is_available", true);
      photos = (photoData ?? []).map((p) => ({
        ...p,
        similarity: byPhoto.get(p.id as string) ?? 0,
      }));
      photos.sort((a, b) => (b.similarity as number) - (a.similarity as number));
    }

    // Log de auditoria (LGPD) — sem selfie
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string | null = null;
    try {
      const token = authHeader.replace("Bearer ", "");
      if (token) {
        const { data } = await admin.auth.getUser(token);
        userId = data.user?.id ?? null;
      }
    } catch (_) {}

    await admin.from("face_search_logs").insert({
      user_id: userId,
      sub_event_id,
      campaign_id,
      matches_count: photos.length,
      threshold,
    });

    return new Response(
      JSON.stringify({ matches: photos, total: photos.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("search-faces-in-album error", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

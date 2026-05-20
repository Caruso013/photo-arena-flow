// Edge Function: indexa rostos de uma foto a partir de embeddings 128-D
// gerados pelo navegador (face-api.js). Só o fotógrafo dono da foto ou
// um admin pode indexar.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FaceInput {
  embedding: number[];
  bbox?: { x: number; y: number; width: number; height: number };
  confidence?: number;
}
interface IndexRequest {
  photo_id: string;
  faces: FaceInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as IndexRequest;
    const { photo_id, faces } = body;

    if (!photo_id || !Array.isArray(faces)) {
      return new Response(JSON.stringify({ error: "photo_id e faces são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar a foto e validar permissão
    const { data: photo, error: photoErr } = await admin
      .from("photos")
      .select("id, photographer_id, campaign_id, sub_event_id")
      .eq("id", photo_id)
      .single();

    if (photoErr || !photo) {
      return new Response(JSON.stringify({ error: "Foto não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permissão: dono da foto, admin, ou fotógrafo atribuído ao álbum
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    const isAdmin = profile?.role === "admin";

    let allowed = isAdmin || photo.photographer_id === userId;
    if (!allowed) {
      const { data: assign } = await admin
        .from("campaign_photographers")
        .select("id")
        .eq("campaign_id", photo.campaign_id)
        .eq("photographer_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      allowed = !!assign;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão para indexar esta foto" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpa embeddings anteriores para esta foto e insere os novos
    await admin.from("photo_face_embeddings").delete().eq("photo_id", photo_id);

    if (faces.length > 0) {
      const rows = faces
        .filter((f) => Array.isArray(f.embedding) && f.embedding.length === 128)
        .map((f, i) => ({
          photo_id,
          campaign_id: photo.campaign_id,
          sub_event_id: photo.sub_event_id,
          face_index: i,
          embedding: `[${f.embedding.map((n) => Number(n).toFixed(6)).join(",")}]`,
          bbox: f.bbox ?? null,
          confidence: f.confidence ?? null,
        }));

      if (rows.length > 0) {
        const { error: insErr } = await admin.from("photo_face_embeddings").insert(rows);
        if (insErr) {
          console.error("insert error", insErr);
          return new Response(JSON.stringify({ error: insErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Marca job como concluído (se existir)
    await admin
      .from("face_processing_jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("photo_id", photo_id);

    return new Response(JSON.stringify({ ok: true, faces_indexed: faces.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("index-photo-faces error", err);
    return new Response(JSON.stringify({ error: err.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

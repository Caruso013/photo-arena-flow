-- 1. Extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de embeddings faciais por foto
CREATE TABLE public.photo_face_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  sub_event_id uuid,
  face_index integer NOT NULL DEFAULT 0,
  embedding vector(128) NOT NULL,
  bbox jsonb,
  confidence real,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pfe_photo ON public.photo_face_embeddings (photo_id);
CREATE INDEX idx_pfe_sub_event ON public.photo_face_embeddings (sub_event_id);
CREATE INDEX idx_pfe_campaign ON public.photo_face_embeddings (campaign_id);
CREATE INDEX idx_pfe_embedding ON public.photo_face_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.photo_face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read face embeddings"
  ON public.photo_face_embeddings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages embeddings"
  ON public.photo_face_embeddings FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage embeddings"
  ON public.photo_face_embeddings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- 3. Fila de processamento
CREATE TABLE public.face_processing_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT face_jobs_status_chk CHECK (status IN ('pending','processing','done','failed'))
);

CREATE INDEX idx_fpj_pending ON public.face_processing_jobs (created_at)
  WHERE status = 'pending';

ALTER TABLE public.face_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages face jobs"
  ON public.face_processing_jobs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins manage face jobs"
  ON public.face_processing_jobs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER trg_fpj_updated_at
  BEFORE UPDATE ON public.face_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Logs de busca
CREATE TABLE public.face_search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  sub_event_id uuid,
  campaign_id uuid,
  matches_count integer NOT NULL DEFAULT 0,
  threshold real,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fsl_user ON public.face_search_logs (user_id, created_at DESC);

ALTER TABLE public.face_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own face search logs"
  ON public.face_search_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all face search logs"
  ON public.face_search_logs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service role inserts face search logs"
  ON public.face_search_logs FOR INSERT
  TO service_role WITH CHECK (true);

-- 5. RPC de busca por similaridade dentro de um álbum
CREATE OR REPLACE FUNCTION public.match_faces_in_album(
  p_sub_event_id uuid,
  p_campaign_id uuid,
  p_embedding vector(128),
  p_threshold real DEFAULT 0.55,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (photo_id uuid, similarity real)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('ivfflat.probes', '10', true);

  RETURN QUERY
  SELECT
    pfe.photo_id,
    (1 - (pfe.embedding <=> p_embedding))::real AS similarity
  FROM public.photo_face_embeddings pfe
  WHERE
    (p_sub_event_id IS NOT NULL AND pfe.sub_event_id = p_sub_event_id)
    OR (p_sub_event_id IS NULL AND pfe.campaign_id = p_campaign_id)
  ORDER BY pfe.embedding <=> p_embedding
  LIMIT p_limit * 3;
END;
$$;

-- 6. Trigger para enfileirar jobs ao subir fotos
CREATE OR REPLACE FUNCTION public.enqueue_face_processing_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.face_processing_jobs (photo_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (photo_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_photos_enqueue_face_job
  AFTER INSERT ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_face_processing_job();

-- 7. LGPD: usuário apaga seus logs
CREATE OR REPLACE FUNCTION public.delete_user_face_search_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  DELETE FROM public.face_search_logs WHERE user_id = auth.uid();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 8. Cascata: ao apagar foto, apaga embeddings e job
CREATE OR REPLACE FUNCTION public.cleanup_face_data_on_photo_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.photo_face_embeddings WHERE photo_id = OLD.id;
  DELETE FROM public.face_processing_jobs WHERE photo_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_photos_cleanup_face_data
  AFTER DELETE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_face_data_on_photo_delete();;

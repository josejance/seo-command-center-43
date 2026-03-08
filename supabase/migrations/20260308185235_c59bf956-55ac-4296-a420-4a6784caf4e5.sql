
CREATE TABLE public.keyword_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  intent TEXT,
  keyword_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clusters"
ON public.keyword_clusters FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can create own clusters"
ON public.keyword_clusters FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update own clusters"
ON public.keyword_clusters FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete own clusters"
ON public.keyword_clusters FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));


-- Schedules table for automation
CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  apis jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency text NOT NULL DEFAULT 'once',
  schedule_time text DEFAULT '08:00',
  schedule_day integer,
  next_run timestamp with time zone,
  last_run timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON public.schedules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = schedules.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can create own schedules" ON public.schedules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = schedules.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update own schedules" ON public.schedules
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = schedules.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete own schedules" ON public.schedules
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = schedules.project_id AND projects.user_id = auth.uid()));

-- Automation logs table
CREATE TABLE public.automation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation_logs" ON public.automation_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = automation_logs.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can create own automation_logs" ON public.automation_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = automation_logs.project_id AND projects.user_id = auth.uid()));

-- Pipeline configs table
CREATE TABLE public.pipeline_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Pipeline Padrão',
  min_score integer NOT NULL DEFAULT 70,
  steps jsonb NOT NULL DEFAULT '[{"name":"research","label":"Pesquisar Keyword","auto":true},{"name":"analyze","label":"Analisar Oportunidades","auto":true},{"name":"outline","label":"Gerar Outline","auto":true},{"name":"draft","label":"Gerar Draft","auto":false},{"name":"seo_review","label":"Revisar SEO","auto":false},{"name":"notify","label":"Notificar Revisão","auto":true}]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pipeline_configs" ON public.pipeline_configs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_configs.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can create own pipeline_configs" ON public.pipeline_configs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_configs.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update own pipeline_configs" ON public.pipeline_configs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_configs.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete own pipeline_configs" ON public.pipeline_configs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_configs.project_id AND projects.user_id = auth.uid()));

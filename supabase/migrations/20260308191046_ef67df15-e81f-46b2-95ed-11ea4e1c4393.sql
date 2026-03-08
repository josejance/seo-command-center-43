
-- Rank history table
CREATE TABLE public.rank_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id uuid NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  position integer,
  url text,
  domain text,
  checked_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rank_history" ON public.rank_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM keywords k JOIN projects p ON p.id = k.project_id
    WHERE k.id = rank_history.keyword_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own rank_history" ON public.rank_history
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM keywords k JOIN projects p ON p.id = k.project_id
    WHERE k.id = rank_history.keyword_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own rank_history" ON public.rank_history
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM keywords k JOIN projects p ON p.id = k.project_id
    WHERE k.id = rank_history.keyword_id AND p.user_id = auth.uid()
  ));

-- Alerts table
CREATE TYPE public.alert_type AS ENUM ('rank_drop', 'rank_improvement', 'new_competitor', 'keyword_trend');
CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type public.alert_type NOT NULL,
  message text NOT NULL,
  keyword_id uuid REFERENCES public.keywords(id) ON DELETE SET NULL,
  severity public.alert_severity NOT NULL DEFAULT 'medium',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = alerts.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own alerts" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = alerts.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own alerts" ON public.alerts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = alerts.project_id AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own alerts" ON public.alerts
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = alerts.project_id AND projects.user_id = auth.uid()
  ));

-- Monitoring config: add monitored flag + frequency to keywords or use app_settings
-- We'll use app_settings for monitoring_domain and monitoring_frequency per project
-- And add a "monitored" boolean to keywords
ALTER TABLE public.keywords ADD COLUMN monitored boolean NOT NULL DEFAULT false;

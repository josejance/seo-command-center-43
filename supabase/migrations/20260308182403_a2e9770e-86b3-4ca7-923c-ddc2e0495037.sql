
-- Enums
CREATE TYPE public.keyword_source_type AS ENUM ('main', 'related', 'suggestion', 'idea', 'autocomplete', 'subtopic', 'paa');
CREATE TYPE public.keyword_status AS ENUM ('pending', 'analyzed', 'content_created', 'published');
CREATE TYPE public.serp_result_type AS ENUM ('organic', 'featured_snippet', 'people_also_ask', 'video', 'local');
CREATE TYPE public.content_status AS ENUM ('outline', 'draft', 'review', 'final', 'published');

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_location TEXT NOT NULL DEFAULT 'Brazil',
  target_language TEXT NOT NULL DEFAULT 'Portuguese',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Keywords
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  source_type public.keyword_source_type NOT NULL DEFAULT 'main',
  search_volume INTEGER,
  search_intent TEXT,
  keyword_difficulty FLOAT,
  competition_level TEXT,
  cpc FLOAT,
  parent_keyword_id UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
  status public.keyword_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own keywords" ON public.keywords FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = keywords.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own keywords" ON public.keywords FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = keywords.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own keywords" ON public.keywords FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = keywords.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own keywords" ON public.keywords FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = keywords.project_id AND projects.user_id = auth.uid())
);

-- SERP Results
CREATE TABLE public.serp_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  domain TEXT,
  url TEXT,
  title TEXT,
  description TEXT,
  result_type public.serp_result_type NOT NULL DEFAULT 'organic',
  paa_answer TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.serp_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own serp_results" ON public.serp_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = serp_results.keyword_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users can create own serp_results" ON public.serp_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = serp_results.keyword_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users can update own serp_results" ON public.serp_results FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = serp_results.keyword_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users can delete own serp_results" ON public.serp_results FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = serp_results.keyword_id AND p.user_id = auth.uid())
);

-- Content Pieces
CREATE TABLE public.content_pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  outline JSONB,
  draft TEXT,
  final_content TEXT,
  seo_score FLOAT,
  status public.content_status NOT NULL DEFAULT 'outline',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own content_pieces" ON public.content_pieces FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = content_pieces.keyword_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users can create own content_pieces" ON public.content_pieces FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = content_pieces.keyword_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users can update own content_pieces" ON public.content_pieces FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = content_pieces.keyword_id AND p.user_id = auth.uid())
);
CREATE POLICY "Users can delete own content_pieces" ON public.content_pieces FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.keywords k JOIN public.projects p ON p.id = k.project_id WHERE k.id = content_pieces.keyword_id AND p.user_id = auth.uid())
);

-- Research History
CREATE TABLE public.research_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
  api_endpoint TEXT,
  raw_response JSONB,
  cost_credits FLOAT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.research_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own research_history" ON public.research_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_history.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create own research_history" ON public.research_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = research_history.project_id AND projects.user_id = auth.uid())
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_pieces_updated_at BEFORE UPDATE ON public.content_pieces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

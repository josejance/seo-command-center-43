import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Layers, AlertTriangle, Globe, Map } from 'lucide-react';
import ClusteringSection from '@/components/analysis/ClusteringSection';
import ContentGapSection from '@/components/analysis/ContentGapSection';
import CompetitorSection from '@/components/analysis/CompetitorSection';
import IntentMapSection from '@/components/analysis/IntentMapSection';
import SeoGlossary from '@/components/analysis/SeoGlossary';
import { toast } from 'sonner';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  search_intent: string | null;
  source_type: string;
}

interface SerpResult {
  id: string;
  position: number;
  domain: string | null;
  url: string | null;
  title: string | null;
  keyword_id: string;
  result_type: string;
}

interface Cluster {
  id: string;
  name: string;
  intent: string | null;
  keyword_ids: string[];
}

export default function ProjectAnalysis() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');

  const loadData = useCallback(async () => {
    if (!user || !projectId) return;

    const [projectRes, kwRes, serpRes, clusterRes] = await Promise.all([
      supabase.from('projects').select('name').eq('id', projectId).single(),
      supabase.from('keywords').select('*').eq('project_id', projectId).order('search_volume', { ascending: false, nullsFirst: false }),
      supabase.from('serp_results').select('*').in(
        'keyword_id',
        (await supabase.from('keywords').select('id').eq('project_id', projectId)).data?.map(k => k.id) ?? []
      ),
      supabase.from('keyword_clusters').select('*').eq('project_id', projectId),
    ]);

    if (projectRes.data) setProjectName(projectRes.data.name);
    setKeywords((kwRes.data ?? []) as unknown as Keyword[]);
    setSerpResults((serpRes.data ?? []) as unknown as SerpResult[]);
    setClusters((clusterRes.data ?? []).map(c => ({
      ...c,
      keyword_ids: (c.keyword_ids as string[]) ?? [],
    })) as Cluster[]);
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleResearchSubtopic = (subtopic: string) => {
    toast.info(`Navegar para pesquisa de "${subtopic}"`);
    navigate(`/projects/${projectId}/research?q=${encodeURIComponent(subtopic)}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando análise...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Clustering & Análise</h1>
            <p className="text-sm text-muted-foreground">{projectName} · {keywords.length} keywords</p>
          </div>
        </div>
        <SeoGlossary />
      </div>

      <Tabs defaultValue="clustering">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="clustering" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clusters</span>
          </TabsTrigger>
          <TabsTrigger value="content-gap" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Content Gap</span>
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Competidores</span>
          </TabsTrigger>
          <TabsTrigger value="intent-map" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Map className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Intenções</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clustering" className="mt-6">
          <ClusteringSection
            projectId={projectId!}
            keywords={keywords}
            clusters={clusters}
            onClustersUpdated={loadData}
          />
        </TabsContent>

        <TabsContent value="content-gap" className="mt-6">
          <ContentGapSection keywords={keywords} onResearchSubtopic={handleResearchSubtopic} />
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          <CompetitorSection serpResults={serpResults.filter(r => r.result_type === 'organic')} keywords={keywords} />
        </TabsContent>

        <TabsContent value="intent-map" className="mt-6">
          <IntentMapSection keywords={keywords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

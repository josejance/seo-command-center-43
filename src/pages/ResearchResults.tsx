import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, BarChart3, MessageSquare, Globe, TrendingUp } from 'lucide-react';
import TabOverview from '@/components/research/TabOverview';
import TabSerp from '@/components/research/TabSerp';
import TabPaa from '@/components/research/TabPaa';
import TabKeywordsUniverse from '@/components/research/TabKeywordsUniverse';
import TabOpportunities from '@/components/research/TabOpportunities';

interface MainKeyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  search_intent: string | null;
  competition_level: string | null;
  project_id: string;
}

interface SerpResult {
  id: string;
  position: number;
  domain: string | null;
  url: string | null;
  title: string | null;
  description: string | null;
  result_type: string;
  paa_answer: string | null;
  keyword_id: string;
}

interface ChildKeyword {
  id: string;
  keyword: string;
  source_type: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
  cpc: number | null;
}

export default function ResearchResults() {
  const { id: projectId, keywordId } = useParams<{ id: string; keywordId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mainKeyword, setMainKeyword] = useState<MainKeyword | null>(null);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [paaResults, setPaaResults] = useState<SerpResult[]>([]);
  const [childKeywords, setChildKeywords] = useState<ChildKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !keywordId || !projectId) return;

    const load = async () => {
      // Fetch main keyword
      const { data: kwData } = await supabase
        .from('keywords')
        .select('*')
        .eq('id', keywordId)
        .single();

      if (kwData) setMainKeyword(kwData as unknown as MainKeyword);

      // Fetch SERP results for main keyword
      const { data: serpData } = await supabase
        .from('serp_results')
        .select('*')
        .eq('keyword_id', keywordId)
        .order('position');

      const allSerp = (serpData ?? []) as unknown as SerpResult[];
      setSerpResults(allSerp.filter(r => r.result_type === 'organic'));

      // Fetch child keywords (related, suggestions, ideas, etc.)
      const { data: childKwData } = await supabase
        .from('keywords')
        .select('*')
        .eq('project_id', projectId)
        .eq('parent_keyword_id', keywordId)
        .order('search_volume', { ascending: false, nullsFirst: false });

      setChildKeywords((childKwData ?? []) as unknown as ChildKeyword[]);

      // Fetch PAA - these are serp_results linked to child keywords with type 'paa'
      const paaChildIds = (childKwData ?? [])
        .filter((k: any) => k.source_type === 'paa')
        .map((k: any) => k.id);

      if (paaChildIds.length > 0) {
        const { data: paaData } = await supabase
          .from('serp_results')
          .select('*')
          .in('keyword_id', paaChildIds);
        setPaaResults((paaData ?? []) as unknown as SerpResult[]);
      }

      setLoading(false);
    };

    load();
  }, [user, keywordId, projectId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando resultados...</div>;
  }

  if (!mainKeyword) {
    return <div className="text-muted-foreground text-center py-12">Keyword não encontrada.</div>;
  }

  const organicSerp = serpResults.filter(r => r.result_type === 'organic');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Resultados: <span className="text-primary">{mainKeyword.keyword}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {childKeywords.length} keywords relacionadas · {organicSerp.length} resultados SERP · {paaResults.length} PAA
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="serp" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SERP</span>
          </TabsTrigger>
          <TabsTrigger value="paa" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PAA</span>
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keywords</span>
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Oportunidades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <TabOverview keyword={mainKeyword} />
        </TabsContent>

        <TabsContent value="serp" className="mt-6">
          <TabSerp results={organicSerp} />
        </TabsContent>

        <TabsContent value="paa" className="mt-6">
          <TabPaa results={paaResults} projectId={projectId!} />
        </TabsContent>

        <TabsContent value="keywords" className="mt-6">
          <TabKeywordsUniverse keywords={childKeywords} />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6">
          <TabOpportunities keywords={childKeywords} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

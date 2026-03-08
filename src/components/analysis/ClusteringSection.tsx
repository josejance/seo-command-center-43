import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Sparkles, ChevronDown, Layers } from 'lucide-react';
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

interface Cluster {
  id: string;
  name: string;
  intent: string | null;
  keyword_ids: string[];
}

interface Props {
  projectId: string;
  keywords: Keyword[];
  clusters: Cluster[];
  onClustersUpdated: () => void;
}

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
  navigational: 'bg-primary/20 text-primary',
};

export default function ClusteringSection({ projectId, keywords, clusters, onClustersUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const handleCluster = async () => {
    if (keywords.length === 0) {
      toast.error('Nenhuma keyword encontrada para agrupar.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cluster-keywords', {
        body: {
          project_id: projectId,
          keywords: keywords.map(k => ({ id: k.id, keyword: k.keyword })),
        },
      });
      if (error) throw error;
      toast.success(`${data?.count ?? 0} clusters criados com IA!`);
      onClustersUpdated();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao clusterizar keywords');
    }
    setLoading(false);
  };

  const kwMap = new Map(keywords.map(k => [k.id, k]));

  const getClusterStats = (cluster: Cluster) => {
    const kws = (cluster.keyword_ids as string[]).map(id => kwMap.get(id)).filter(Boolean) as Keyword[];
    const totalVol = kws.reduce((s, k) => s + (k.search_volume ?? 0), 0);
    const avgKd = kws.length > 0 ? Math.round(kws.reduce((s, k) => s + (k.keyword_difficulty ?? 0), 0) / kws.length) : 0;
    return { kws, totalVol, avgKd, count: kws.length };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Clustering Automático
          </h3>
          <p className="text-sm text-muted-foreground">Agrupamento por similaridade semântica via IA</p>
        </div>
        <Button onClick={handleCluster} disabled={loading || keywords.length === 0}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {clusters.length > 0 ? 'Reagrupar' : 'Gerar Clusters'}
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Clique em "Gerar Clusters" para agrupar suas keywords com IA.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map(cluster => {
            const { kws, totalVol, avgKd, count } = getClusterStats(cluster);
            const isExpanded = expandedCluster === cluster.id;
            return (
              <Collapsible key={cluster.id} open={isExpanded} onOpenChange={() => setExpandedCluster(isExpanded ? null : cluster.id)}>
                <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-semibold">{cluster.name}</CardTitle>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cluster.intent && (
                          <Badge variant="outline" className={`text-xs ${INTENT_BADGE[cluster.intent] ?? ''}`}>{cluster.intent}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{count} keywords</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Volume Total</p>
                          <p className="text-lg font-bold">{totalVol.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">KD Média</p>
                          <p className="text-lg font-bold">{avgKd}</p>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 border-t border-border/50">
                      <div className="space-y-1.5 mt-3 max-h-60 overflow-y-auto">
                        {kws.map(kw => (
                          <div key={kw.id} className="flex items-center justify-between text-sm py-1">
                            <span className="truncate flex-1">{kw.keyword}</span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                              <span>{kw.search_volume?.toLocaleString() ?? '—'}</span>
                              <span>KD {kw.keyword_difficulty ?? '—'}</span>
                            </div>
                          </div>
                        ))}
                        {kws.length === 0 && <p className="text-xs text-muted-foreground py-2">Nenhuma keyword mapeada</p>}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

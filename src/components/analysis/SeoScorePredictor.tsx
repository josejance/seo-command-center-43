import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, Brain, TrendingUp, Target, Clock, ArrowRight, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
}

interface SerpResult {
  id: string;
  position: number;
  domain: string | null;
  title: string | null;
  keyword_id: string;
  result_type: string;
}

interface Prediction {
  ranking_probability: number;
  difficulty_assessment: string;
  dominant_content_type: string;
  authority_required: string;
  serp_features: string[];
  opportunities: string[];
  estimated_time_to_rank: string;
  recommendation: string;
  factors: { factor: string; impact: string; detail: string }[];
}

interface Props {
  keywords: Keyword[];
  serpResults: SerpResult[];
  projectId: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-chart-3',
  moderate: 'text-chart-4',
  hard: 'text-destructive',
  very_hard: 'text-destructive',
};

const IMPACT_ICONS: Record<string, typeof CheckCircle2> = {
  positive: CheckCircle2,
  negative: XCircle,
  neutral: Minus,
};

export default function SeoScorePredictor({ keywords, serpResults, projectId }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);

  const mainKeywords = keywords.filter(k => k.search_volume);

  const predict = async () => {
    if (!selectedId) return;
    const kw = keywords.find(k => k.id === selectedId);
    if (!kw) return;

    setLoading(true);
    try {
      const kwSerp = serpResults.filter(r => r.keyword_id === selectedId && r.result_type === 'organic').sort((a, b) => a.position - b.position).slice(0, 10);

      // Get user domain from settings
      const { data: settings } = await supabase.from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'domains')
        .single();
      let domain = '';
      try { domain = JSON.parse(settings?.setting_value ?? '[]')[0] ?? ''; } catch {}

      const { data, error } = await supabase.functions.invoke('predict-seo-score', {
        body: {
          keyword: kw.keyword,
          search_volume: kw.search_volume,
          keyword_difficulty: kw.keyword_difficulty,
          search_intent: kw.search_intent,
          serp_results: kwSerp.map(r => ({ title: r.title, domain: r.domain, position: r.position })),
          domain,
        },
      });
      if (error) throw error;
      if (data?.prediction) {
        setPrediction(data.prediction);
        toast.success('Análise preditiva concluída!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro na predição');
    }
    setLoading(false);
  };

  const probColor = (p: number) => p >= 70 ? 'text-chart-3' : p >= 40 ? 'text-chart-4' : 'text-destructive';

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            SEO Score Preditivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Selecione uma keyword para prever a probabilidade de ranquear com base nos padrões da SERP.</p>
          <div className="flex gap-3 flex-wrap">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[300px]"><SelectValue placeholder="Selecione uma keyword..." /></SelectTrigger>
              <SelectContent>
                {mainKeywords.map(k => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.keyword} ({k.search_volume?.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={predict} disabled={!selectedId || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              Analisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {prediction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Probabilidade de Ranquear</p>
                <div className={`text-5xl font-bold ${probColor(prediction.ranking_probability)}`}>
                  {prediction.ranking_probability}%
                </div>
                <Progress value={prediction.ranking_probability} className="mt-3 h-3" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Dificuldade</p>
                  <p className={`font-semibold capitalize ${DIFFICULTY_COLORS[prediction.difficulty_assessment] ?? ''}`}>
                    {prediction.difficulty_assessment?.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Tempo estimado</p>
                  <p className="font-semibold text-sm">{prediction.estimated_time_to_rank}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Conteúdo dominante</p>
                <Badge variant="outline">{prediction.dominant_content_type}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Autoridade necessária</p>
                <Badge variant="outline" className="capitalize">{prediction.authority_required?.replace('_', ' ')}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-chart-3" /> Oportunidades
                </p>
                <ul className="space-y-1.5">
                  {prediction.opportunities?.map((o, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {prediction.serp_features?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">SERP Features</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.serp_features.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {prediction.factors?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Fatores de Análise</p>
                  <div className="space-y-2">
                    {prediction.factors.map((f, i) => {
                      const Icon = IMPACT_ICONS[f.impact] ?? Minus;
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${f.impact === 'positive' ? 'text-chart-3' : f.impact === 'negative' ? 'text-destructive' : 'text-muted-foreground'}`} />
                          <div>
                            <span className="font-medium">{f.factor}:</span>{' '}
                            <span className="text-muted-foreground">{f.detail}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm"><strong>Recomendação:</strong> {prediction.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

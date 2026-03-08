import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { exportToCSV } from '@/lib/csv';

interface Keyword {
  id: string;
  keyword: string;
  source_type: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
  cpc: number | null;
}

interface Props {
  keywords: Keyword[];
}

const INTENT_BONUS: Record<string, number> = {
  transactional: 100,
  commercial: 80,
  informational: 50,
  navigational: 20,
};

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  navigational: 'bg-primary/20 text-primary',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
};

function calcScore(kw: Keyword): number {
  const vol = Math.min(kw.search_volume ?? 0, 10000);
  const normVol = (vol / 10000) * 100;
  const ease = 100 - (kw.keyword_difficulty ?? 50);
  const cpcVal = Math.min((kw.cpc ?? 0) * 10, 100);
  const intentBonus = INTENT_BONUS[kw.search_intent?.toLowerCase() ?? ''] ?? 30;
  return normVol * 0.4 + ease * 0.3 + cpcVal * 0.2 + intentBonus * 0.1;
}

function getRecommendation(kw: Keyword, score: number): string {
  const vol = kw.search_volume ?? 0;
  const kd = kw.keyword_difficulty ?? 50;
  const intent = kw.search_intent?.toLowerCase() ?? '';

  if (score >= 70) {
    if (kd <= 30) return `Excelente oportunidade! Baixa dificuldade com ${vol > 1000 ? 'alto' : 'bom'} volume. Crie conteúdo ${intent === 'informational' ? 'educativo detalhado' : intent === 'transactional' ? 'focado em conversão' : 'comparativo'} imediatamente.`;
    return `Oportunidade forte. ${intent === 'commercial' ? 'Alta intenção comercial — priorize landing pages.' : 'Invista em conteúdo profundo com backlinks.'}`;
  }
  if (score >= 45) {
    return `Oportunidade moderada. ${kd > 60 ? 'A dificuldade é alta — considere long-tail variations.' : 'Boa relação volume/dificuldade para conteúdo de qualidade.'}`;
  }
  return `Baixo potencial relativo. ${vol < 50 ? 'Volume muito baixo.' : 'Dificuldade desproporcional ao volume.'} Considere como keyword de suporte.`;
}

export default function TabOpportunities({ keywords }: Props) {
  const scored = useMemo(() => {
    return keywords
      .filter(kw => kw.source_type !== 'main')
      .map(kw => ({ ...kw, score: calcScore(kw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [keywords]);

  const handleExport = () => {
    exportToCSV(
      scored.map(k => ({ keyword: k.keyword, score: Math.round(k.score), volume: k.search_volume, dificuldade: k.keyword_difficulty, cpc: k.cpc, intent: k.search_intent })),
      'oportunidades-seo'
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Top Oportunidades</h3>
          <p className="text-sm text-muted-foreground">Score = Volume×0.4 + Facilidade×0.3 + CPC×0.2 + Intent×0.1</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-3.5 w-3.5" />CSV</Button>
      </div>

      <div className="space-y-4">
        {scored.map((kw, i) => {
          const radarData = [
            { metric: 'Volume', value: Math.min(((kw.search_volume ?? 0) / 10000) * 100, 100) },
            { metric: 'Facilidade', value: 100 - (kw.keyword_difficulty ?? 50) },
            { metric: 'CPC', value: Math.min((kw.cpc ?? 0) * 10, 100) },
            { metric: 'Intent', value: INTENT_BONUS[kw.search_intent?.toLowerCase() ?? ''] ?? 30 },
          ];

          return (
            <Card key={kw.id} className={`bg-card border-border/50 ${i < 3 ? 'border-primary/30' : ''}`}>
              <CardContent className="pt-5">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Score + Radar */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center min-w-[60px]">
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      <div className={`text-2xl font-bold ${kw.score >= 70 ? 'text-chart-3' : kw.score >= 45 ? 'text-chart-4' : 'text-muted-foreground'}`}>
                        {Math.round(kw.score)}
                      </div>
                      <span className="text-xs text-muted-foreground">score</span>
                    </div>
                    <div className="w-[120px] h-[100px] hidden sm:block">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(240,4%,16%)" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(240,5%,60%)', fontSize: 9 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar dataKey="value" stroke="hsl(263,70%,50%)" fill="hsl(263,70%,50%)" fillOpacity={0.2} strokeWidth={1.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-semibold">{kw.keyword}</h4>
                      {kw.search_intent && (
                        <Badge variant="outline" className={`text-xs ${INTENT_BADGE[kw.search_intent.toLowerCase()] ?? ''}`}>{kw.search_intent}</Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Vol: <strong className="text-foreground">{kw.search_volume?.toLocaleString() ?? '—'}</strong></span>
                      <span>KD: <strong className="text-foreground">{kw.keyword_difficulty ?? '—'}</strong></span>
                      <span>CPC: <strong className="text-foreground">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</strong></span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {getRecommendation(kw, kw.score)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

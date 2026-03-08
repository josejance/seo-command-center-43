import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Loader2, Sparkles } from 'lucide-react';

interface Props {
  keyword: {
    id: string;
    keyword: string;
    search_volume: number | null;
    keyword_difficulty: number | null;
    cpc: number | null;
    search_intent: string | null;
    competition_level: string | null;
  };
}

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  navigational: 'bg-primary/20 text-primary',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
};

function DifficultyGauge({ value }: { value: number }) {
  const angle = (value / 100) * 180;
  const color = value <= 30 ? 'hsl(150,60%,45%)' : value <= 60 ? 'hsl(40,90%,55%)' : value <= 80 ? 'hsl(340,65%,55%)' : 'hsl(0,63%,51%)';
  const label = value <= 30 ? 'Fácil' : value <= 60 ? 'Médio' : value <= 80 ? 'Difícil' : 'Muito Difícil';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="hsl(240,4%,16%)" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
        />
        <text x="60" y="55" textAnchor="middle" fill="currentColor" fontSize="20" fontWeight="bold">{value}</text>
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function MetricTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function TabOverview({ keyword: kw }: Props) {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoadingSummary(true);
      try {
        const { data, error } = await supabase.functions.invoke('keyword-summary', {
          body: {
            keyword: kw.keyword,
            search_volume: kw.search_volume,
            keyword_difficulty: kw.keyword_difficulty,
            cpc: kw.cpc,
            search_intent: kw.search_intent,
            competition_level: kw.competition_level,
          },
        });
        if (error) throw error;
        setSummary(data?.summary || 'Não foi possível gerar o resumo.');
      } catch {
        setSummary('Não foi possível gerar o resumo automático.');
      }
      setLoadingSummary(false);
    };
    fetchSummary();
  }, [kw]);

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="bg-card border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 opacity-5" style={{ background: 'linear-gradient(135deg, hsl(263 70% 50%), hsl(200 70% 50%))' }} />
        <CardContent className="pt-6 relative">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-primary">{kw.keyword}</h2>
            <Badge variant="outline" className={`mt-2 ${INTENT_BADGE[kw.search_intent?.toLowerCase() ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
              {kw.search_intent ?? 'N/A'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Volume */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Volume
                <MetricTooltip text="Número estimado de buscas mensais no Google para esta palavra-chave no Brasil. Acima de 1.000 é considerado alto para nichos específicos." />
              </p>
              <p className="text-3xl font-bold mt-1">{kw.search_volume?.toLocaleString() ?? '—'}</p>
            </div>

            {/* Difficulty Gauge */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Dificuldade
                <MetricTooltip text="Escala de 0-100 que indica quão difícil é ranquear na primeira página. 0-30: fácil para sites novos. 31-60: requer autoridade moderada. 61+: precisa de backlinks fortes e conteúdo excepcional." />
              </p>
              <div className="mt-1">
                {kw.keyword_difficulty != null ? <DifficultyGauge value={Math.round(kw.keyword_difficulty)} /> : <p className="text-3xl font-bold">—</p>}
              </div>
            </div>

            {/* CPC */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                CPC
                <MetricTooltip text="Custo por clique no Google Ads. CPC alto (>R$2) indica alta intenção comercial — ótimo para conversão." />
              </p>
              <p className="text-3xl font-bold mt-1">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</p>
            </div>

            {/* Intent */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Intenção
                <MetricTooltip text="Informacional = quer aprender. Comercial = está comparando. Transacional = quer comprar. Navegacional = busca site específico." />
              </p>
              <p className="text-lg font-semibold mt-3 capitalize">{kw.search_intent ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{kw.competition_level ?? ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2">Resumo Inteligente</p>
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando análise...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

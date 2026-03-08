import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingDown, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface RankEntry {
  keyword_id: string;
  position: number | null;
  url: string | null;
  checked_at: string;
}

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  monitored: boolean;
}

interface DecayItem {
  keyword: string;
  keyword_id: string;
  currentPos: number;
  bestPos: number;
  drop: number;
  url: string | null;
  suggestion: string;
}

interface Props {
  projectId: string;
  keywords: Keyword[];
  rankData: Record<string, RankEntry[]>;
}

export default function ContentDecaySection({ projectId, keywords, rankData }: Props) {
  const [decayItems, setDecayItems] = useState<DecayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const analyzeDecay = async () => {
    setLoading(true);
    try {
      const items: DecayItem[] = [];
      const monitoredKws = keywords.filter(k => k.monitored);

      for (const kw of monitoredKws) {
        const entries = rankData[kw.id] ?? [];
        if (entries.length < 2) continue;

        const positions = entries.filter(e => e.position !== null).map(e => e.position!);
        if (positions.length < 2) continue;

        const bestPos = Math.min(...positions);
        const currentPos = positions[positions.length - 1];
        const drop = currentPos - bestPos;

        if (drop >= 3) {
          items.push({
            keyword: kw.keyword,
            keyword_id: kw.id,
            currentPos,
            bestPos,
            drop,
            url: entries[entries.length - 1]?.url ?? null,
            suggestion: drop >= 10
              ? 'Reescrever conteúdo com dados atualizados e novas seções'
              : drop >= 5
              ? 'Atualizar informações e adicionar seções para PAA recentes'
              : 'Otimizar meta tags e melhorar links internos',
          });
        }
      }

      // Try to get AI suggestions if we have decay items
      if (items.length > 0) {
        try {
          const { data } = await supabase.functions.invoke('detect-content-decay', {
            body: {
              project_id: projectId,
              decay_items: items.map(i => ({
                keyword: i.keyword,
                current_position: i.currentPos,
                best_position: i.bestPos,
                drop: i.drop,
              })),
            },
          });
          if (data?.suggestions) {
            data.suggestions.forEach((s: any, idx: number) => {
              if (items[idx]) items[idx].suggestion = s.suggestion;
            });
          }
        } catch {
          // Use default suggestions
        }
      }

      items.sort((a, b) => b.drop - a.drop);
      setDecayItems(items);
      setAnalyzed(true);

      if (items.length === 0) {
        toast.success('Nenhum conteúdo em decadência detectado! 🎉');
      } else {
        toast.warning(`${items.length} conteúdo(s) em decadência detectado(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro na análise');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            Content Decay Detector
          </h3>
          <p className="text-sm text-muted-foreground">Detecta conteúdos que estão perdendo posição e sugere ações.</p>
        </div>
        <Button onClick={analyzeDecay} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Analisar Decadência
        </Button>
      </div>

      {analyzed && decayItems.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-10 w-10 text-chart-3 mb-3" />
            <p className="text-muted-foreground font-medium">Todos os conteúdos estão estáveis!</p>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma queda significativa detectada nas keywords monitoradas.</p>
          </CardContent>
        </Card>
      )}

      {decayItems.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              {decayItems.length} conteúdo(s) em decadência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-center">Melhor Posição</TableHead>
                    <TableHead className="text-center">Posição Atual</TableHead>
                    <TableHead className="text-center">Queda</TableHead>
                    <TableHead>Sugestão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decayItems.map(item => (
                    <TableRow key={item.keyword_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.keyword}</p>
                          {item.url && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.url}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-chart-3">{item.bestPos}</TableCell>
                      <TableCell className="text-center font-mono text-destructive">{item.currentPos}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={
                          item.drop >= 10 ? 'border-destructive text-destructive' :
                          item.drop >= 5 ? 'border-chart-4 text-chart-4' :
                          'border-muted-foreground text-muted-foreground'
                        }>
                          -{item.drop}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px]">{item.suggestion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!analyzed && (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Clique em "Analisar Decadência" para detectar conteúdos perdendo posição.</p>
            <p className="text-xs text-muted-foreground mt-1">Necessário ter keywords monitoradas com histórico de ranking.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Search } from 'lucide-react';

interface Keyword {
  id: string;
  keyword: string;
  source_type: string;
  search_volume: number | null;
}

interface Props {
  keywords: Keyword[];
  onResearchSubtopic: (subtopic: string) => void;
}

export default function ContentGapSection({ keywords, onResearchSubtopic }: Props) {
  const subtopics = useMemo(() => keywords.filter(k => k.source_type === 'subtopic'), [keywords]);
  const otherKeywords = useMemo(() => keywords.filter(k => k.source_type !== 'subtopic'), [keywords]);

  const coveredSubtopics = useMemo(() => {
    return subtopics.filter(st => {
      const stWords = st.keyword.toLowerCase().split(/\s+/);
      return otherKeywords.some(kw => {
        const kwWords = kw.keyword.toLowerCase();
        return stWords.some(w => w.length > 3 && kwWords.includes(w));
      });
    });
  }, [subtopics, otherKeywords]);

  const uncoveredSubtopics = subtopics.filter(st => !coveredSubtopics.find(c => c.id === st.id));
  const coveragePercent = subtopics.length > 0 ? Math.round((coveredSubtopics.length / subtopics.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-chart-4" /> Content Gap Analysis
      </h3>

      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">Cobertura de subtópicos</p>
            <p className="text-4xl font-bold mt-1">{coveragePercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {coveredSubtopics.length} de {subtopics.length} subtópicos cobertos
            </p>
          </div>
          <Progress value={coveragePercent} className="h-2" />
        </CardContent>
      </Card>

      {uncoveredSubtopics.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Subtópicos Não Cobertos
              <Badge variant="destructive" className="text-xs">{uncoveredSubtopics.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {uncoveredSubtopics.map(st => (
                <div key={st.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-sm">{st.keyword}</span>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onResearchSubtopic(st.keyword)}>
                    <Search className="mr-1 h-3 w-3" /> Pesquisar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {subtopics.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum subtópico encontrado. Execute uma pesquisa com subtópicos habilitados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Globe, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToCSV } from '@/lib/csv';

interface SerpResult {
  id: string;
  position: number;
  domain: string | null;
  url: string | null;
  title: string | null;
  keyword_id: string;
}

interface Keyword {
  id: string;
  keyword: string;
}

interface Props {
  serpResults: SerpResult[];
  keywords: Keyword[];
}

interface DomainStat {
  domain: string;
  appearances: number;
  avgPosition: number;
  keywordsInCommon: { keyword: string; position: number }[];
}

export default function CompetitorSection({ serpResults, keywords }: Props) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const kwMap = new Map(keywords.map(k => [k.id, k.keyword]));

  const domainStats = useMemo(() => {
    const map = new Map<string, { positions: number[]; keywords: { keyword: string; position: number }[] }>();

    serpResults.forEach(r => {
      if (!r.domain) return;
      const d = r.domain;
      if (!map.has(d)) map.set(d, { positions: [], keywords: [] });
      const entry = map.get(d)!;
      entry.positions.push(r.position);
      const kwName = kwMap.get(r.keyword_id);
      if (kwName) entry.keywords.push({ keyword: kwName, position: r.position });
    });

    const stats: DomainStat[] = [];
    map.forEach((val, domain) => {
      stats.push({
        domain,
        appearances: val.positions.length,
        avgPosition: Math.round((val.positions.reduce((s, p) => s + p, 0) / val.positions.length) * 10) / 10,
        keywordsInCommon: val.keywords.sort((a, b) => a.position - b.position),
      });
    });

    return stats.sort((a, b) => b.appearances - a.appearances).slice(0, 30);
  }, [serpResults, kwMap]);

  const handleExport = () => {
    exportToCSV(
      domainStats.map(d => ({ dominio: d.domain, aparicoes: d.appearances, posicao_media: d.avgPosition, keywords: d.keywordsInCommon.length })),
      'competitor-snapshot'
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Competitor Snapshot
        </h3>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {domainStats.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum dado SERP disponível. Execute uma pesquisa primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead className="text-center">Aparições</TableHead>
                  <TableHead className="text-center">Posição Média</TableHead>
                  <TableHead className="text-center">Keywords</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {domainStats.map(d => (
                  <Collapsible key={d.domain} open={expandedDomain === d.domain} onOpenChange={() => setExpandedDomain(expandedDomain === d.domain ? null : d.domain)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img src={`https://www.google.com/s2/favicons?sz=16&domain=${d.domain}`} alt="" className="w-4 h-4 rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <span className="text-sm font-medium">{d.domain}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{d.appearances}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">{d.avgPosition}</TableCell>
                          <TableCell className="text-center font-mono text-sm">{d.keywordsInCommon.length}</TableCell>
                          <TableCell>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedDomain === d.domain ? 'rotate-180' : ''}`} />
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={5} className="p-4 bg-muted/10 border-b border-border/50">
                            <div className="space-y-1">
                              {d.keywordsInCommon.map((kw, i) => (
                                <div key={i} className="flex items-center justify-between text-sm py-1">
                                  <span>{kw.keyword}</span>
                                  <Badge variant="outline" className="text-xs font-mono">#{kw.position}</Badge>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

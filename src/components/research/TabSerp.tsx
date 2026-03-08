import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ExternalLink, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csv';

interface SerpResult {
  id: string;
  position: number;
  domain: string | null;
  url: string | null;
  title: string | null;
  description: string | null;
  result_type: string;
}

interface Props {
  results: SerpResult[];
}

export default function TabSerp({ results }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const organicResults = results.filter(r => r.result_type === 'organic').sort((a, b) => a.position - b.position);

  // Stats
  const uniqueDomains = [...new Set(organicResults.map(r => r.domain).filter(Boolean))];
  const domainCounts = organicResults.reduce<Record<string, number>>((acc, r) => {
    if (r.domain) acc[r.domain] = (acc[r.domain] || 0) + 1;
    return acc;
  }, {});
  const recurringDomains = Object.entries(domainCounts).filter(([, c]) => c > 1);

  const tldCounts = organicResults.reduce<Record<string, number>>((acc, r) => {
    if (r.domain) {
      const parts = r.domain.split('.');
      const tld = parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : `.${parts[parts.length - 1]}`;
      const normalized = tld.includes('.com.br') ? '.com.br' : tld.includes('.com') ? '.com' : tld;
      acc[normalized] = (acc[normalized] || 0) + 1;
    }
    return acc;
  }, {});

  // Title patterns
  const titles = organicResults.map(r => r.title).filter(Boolean) as string[];
  const avgTitleLen = titles.length > 0 ? Math.round(titles.reduce((s, t) => s + t.length, 0) / titles.length) : 0;
  const hasNumbers = titles.filter(t => /\d/.test(t)).length;
  const hasQuestions = titles.filter(t => /\?|como|o que|por que|quando|qual/i.test(t)).length;

  const wordFreq = useMemo(() => {
    const stopwords = new Set(['de','da','do','e','a','o','em','para','com','que','os','as','um','uma','no','na','por','se','é','ao','dos','das','mais','como','ou','seu','sua']);
    const freq: Record<string, number> = {};
    titles.forEach(t => {
      t.toLowerCase().split(/\s+/).forEach(w => {
        const clean = w.replace(/[^a-záàâãéèêíïóôõúç]/gi, '');
        if (clean.length > 2 && !stopwords.has(clean)) {
          freq[clean] = (freq[clean] || 0) + 1;
        }
      });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [titles]);

  const handleExport = () => {
    exportToCSV(
      organicResults.map(r => ({ posicao: r.position, dominio: r.domain, titulo: r.title, url: r.url, descricao: r.description })),
      'serp-results'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Table */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{organicResults.length} resultados orgânicos</h3>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-3.5 w-3.5" />CSV
          </Button>
        </div>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {organicResults.slice(0, 20).map(r => (
                  <Collapsible key={r.id} open={expandedRow === r.id} onOpenChange={() => setExpandedRow(expandedRow === r.id ? null : r.id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/30">
                          <TableCell className="font-mono text-sm font-bold">{r.position}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img
                                src={`https://www.google.com/s2/favicons?sz=16&domain=${r.domain}`}
                                alt=""
                                className="w-4 h-4 rounded-sm"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="text-sm">{r.domain}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium line-clamp-1">{r.title}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                          </TableCell>
                          <TableCell>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedRow === r.id ? 'rotate-180' : ''}`} />
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={5} className="p-4 bg-muted/10 border-b border-border/50">
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground break-all">{r.url}</p>
                              <p className="text-sm">{r.description}</p>
                              <div className="flex gap-2 mt-2">
                                {r.url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="mr-1 h-3 w-3" />Ver no Google
                                    </a>
                                  </Button>
                                )}
                              </div>
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
      </div>

      {/* Sidebar Stats */}
      <div className="space-y-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estatísticas SERP</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Domínios únicos</span><span className="font-semibold">{uniqueDomains.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recorrentes</span><span className="font-semibold">{recurringDomains.length}</span></div>
            {recurringDomains.length > 0 && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                {recurringDomains.map(([d, c]) => (
                  <div key={d} className="flex justify-between text-xs">
                    <span className="truncate">{d}</span>
                    <Badge variant="secondary" className="text-xs">{c}x</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-border/50 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Por TLD</p>
              {Object.entries(tldCounts).sort((a, b) => b[1] - a[1]).map(([tld, count]) => (
                <div key={tld} className="flex justify-between text-xs">
                  <span>{tld}</span><span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Padrões da SERP</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tamanho médio título</span><span className="font-mono">{avgTitleLen} chars</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Com números</span><span className="font-mono">{hasNumbers}/{titles.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Perguntas</span><span className="font-mono">{hasQuestions}/{titles.length}</span></div>
            {wordFreq.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Palavras mais usadas</p>
                <div className="flex flex-wrap gap-1">
                  {wordFreq.map(([w, c]) => (
                    <Badge key={w} variant="outline" className="text-xs">{w} ({c})</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

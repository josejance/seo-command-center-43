import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Star, ArrowUpDown, Search } from 'lucide-react';
import { exportToCSV } from '@/lib/csv';
import { toast } from 'sonner';

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

const SOURCE_COLORS: Record<string, string> = {
  main: 'bg-primary/20 text-primary',
  related: 'bg-chart-2/20 text-chart-2',
  suggestion: 'bg-chart-3/20 text-chart-3',
  idea: 'bg-chart-4/20 text-chart-4',
  autocomplete: 'bg-chart-5/20 text-chart-5',
  subtopic: 'bg-muted text-muted-foreground',
  paa: 'bg-accent/20 text-accent-foreground',
};

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  navigational: 'bg-primary/20 text-primary',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
};

type SortKey = 'keyword' | 'search_volume' | 'keyword_difficulty' | 'cpc';

export default function TabKeywordsUniverse({ keywords }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [volumeFilter, setVolumeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('search_volume');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isGolden = (kw: Keyword) =>
    (kw.search_volume ?? 0) >= 100 && (kw.keyword_difficulty ?? 100) <= 30;

  const filtered = useMemo(() => {
    let result = [...keywords];

    if (search) result = result.filter(k => k.keyword.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') result = result.filter(k => k.source_type === typeFilter);
    if (intentFilter !== 'all') result = result.filter(k => k.search_intent?.toLowerCase() === intentFilter);
    if (volumeFilter !== 'all') {
      const [min, max] = volumeFilter.split('-').map(Number);
      result = result.filter(k => (k.search_volume ?? 0) >= min && (k.search_volume ?? 0) <= (max || Infinity));
    }
    if (difficultyFilter !== 'all') {
      const [min, max] = difficultyFilter.split('-').map(Number);
      result = result.filter(k => (k.keyword_difficulty ?? 0) >= min && (k.keyword_difficulty ?? 0) <= (max || Infinity));
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return result;
  }, [keywords, search, typeFilter, intentFilter, volumeFilter, difficultyFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(k => k.id)));
  };

  const handleExport = () => {
    const data = (selected.size > 0 ? filtered.filter(k => selected.has(k.id)) : filtered);
    exportToCSV(
      data.map(k => ({ keyword: k.keyword, tipo: k.source_type, volume: k.search_volume, dificuldade: k.keyword_difficulty, intent: k.search_intent, cpc: k.cpc })),
      'keywords-universe'
    );
    toast.success(`${data.length} keywords exportadas`);
  };

  const types = [...new Set(keywords.map(k => k.source_type))];

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar keyword..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Intent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos intents</SelectItem>
            <SelectItem value="informational">Informational</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="transactional">Transactional</SelectItem>
            <SelectItem value="navigational">Navigational</SelectItem>
          </SelectContent>
        </Select>
        <Select value={volumeFilter} onValueChange={setVolumeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Volume" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo volume</SelectItem>
            <SelectItem value="0-100">0-100</SelectItem>
            <SelectItem value="100-1000">100-1.000</SelectItem>
            <SelectItem value="1000-10000">1.000-10.000</SelectItem>
            <SelectItem value="10000-999999">10.000+</SelectItem>
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="KD" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda KD</SelectItem>
            <SelectItem value="0-30">Fácil (0-30)</SelectItem>
            <SelectItem value="31-60">Médio (31-60)</SelectItem>
            <SelectItem value="61-80">Difícil (61-80)</SelectItem>
            <SelectItem value="81-100">Muito Difícil (81+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} keywords {selected.size > 0 && `(${selected.size} selecionadas)`}
        </p>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => toast.info('Funcionalidade em desenvolvimento')}>Criar conteúdo</Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-3.5 w-3.5" />{selected.size > 0 ? `Exportar (${selected.size})` : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead><SortButton label="Keyword" field="keyword" /></TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead><SortButton label="Volume" field="search_volume" /></TableHead>
                <TableHead><SortButton label="KD" field="keyword_difficulty" /></TableHead>
                <TableHead>Intent</TableHead>
                <TableHead><SortButton label="CPC" field="cpc" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(kw => {
                const golden = isGolden(kw);
                return (
                  <TableRow key={kw.id} className={golden ? 'bg-chart-4/5' : ''}>
                    <TableCell>
                      <Checkbox checked={selected.has(kw.id)} onCheckedChange={() => toggleSelect(kw.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {golden && <Star className="h-3.5 w-3.5 text-chart-4 fill-chart-4" />}
                        <span className="text-sm font-medium">{kw.keyword}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${SOURCE_COLORS[kw.source_type] ?? ''}`}>{kw.source_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{kw.search_volume?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell>
                      {kw.keyword_difficulty != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${kw.keyword_difficulty}%`,
                                background: kw.keyword_difficulty <= 30 ? 'hsl(150,60%,45%)' : kw.keyword_difficulty <= 60 ? 'hsl(40,90%,55%)' : 'hsl(0,63%,51%)',
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs">{kw.keyword_difficulty}</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {kw.search_intent ? (
                        <Badge variant="outline" className={`text-xs ${INTENT_BADGE[kw.search_intent.toLowerCase()] ?? ''}`}>{kw.search_intent}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

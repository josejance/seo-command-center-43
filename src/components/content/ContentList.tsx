import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText } from 'lucide-react';

interface ContentPiece {
  id: string;
  title: string;
  status: string;
  seo_score: number | null;
  created_at: string;
  keyword_id: string;
  keyword_name?: string;
}

interface Props {
  pieces: ContentPiece[];
  onNew: () => void;
  onSelect: (piece: ContentPiece) => void;
}

const STATUS_ORDER = ['outline', 'draft', 'review', 'final', 'published'];
const STATUS_COLORS: Record<string, string> = {
  outline: 'bg-muted text-muted-foreground',
  draft: 'bg-chart-4/20 text-chart-4',
  review: 'bg-chart-2/20 text-chart-2',
  final: 'bg-primary/20 text-primary',
  published: 'bg-chart-3/20 text-chart-3',
};

function StatusPipeline({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_ORDER.map((s, i) => {
        const idx = STATUS_ORDER.indexOf(current);
        const active = i <= idx;
        return (
          <div key={s} className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary' : 'bg-muted'}`} />
            {i < STATUS_ORDER.length - 1 && (
              <div className={`w-4 h-0.5 ${active && i < idx ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ContentList({ pieces, onNew, onSelect }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [keywordFilter, setKeywordFilter] = useState('all');

  const keywords = [...new Set(pieces.map(p => p.keyword_name).filter(Boolean))];

  const filtered = useMemo(() => {
    let result = [...pieces];
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (keywordFilter !== 'all') result = result.filter(p => p.keyword_name === keywordFilter);
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [pieces, statusFilter, keywordFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={keywordFilter} onValueChange={setKeywordFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Keyword" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas keywords</SelectItem>
              {keywords.map(k => <SelectItem key={k} value={k!}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onNew} className="gradient-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Novo Conteúdo
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum conteúdo criado ainda.</p>
            <Button variant="outline" className="mt-4" onClick={onNew}>Criar primeiro conteúdo</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead className="text-center">SEO Score</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onSelect(p)}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.keyword_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] ?? ''}`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell><StatusPipeline current={p.status} /></TableCell>
                    <TableCell className="text-center">
                      {p.seo_score != null ? (
                        <span className={`font-mono font-bold ${p.seo_score >= 80 ? 'text-chart-3' : p.seo_score >= 50 ? 'text-chart-4' : 'text-destructive'}`}>
                          {Math.round(p.seo_score)}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

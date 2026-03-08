import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';

type ContentStatus = 'outline' | 'draft' | 'review' | 'final' | 'published';

interface ContentPiece {
  id: string;
  title: string;
  status: ContentStatus;
  seo_score: number | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<ContentStatus, string> = {
  outline: 'bg-muted text-muted-foreground',
  draft: 'bg-chart-4/20 text-chart-4',
  review: 'bg-chart-2/20 text-chart-2',
  final: 'bg-chart-3/20 text-chart-3',
  published: 'bg-primary/20 text-primary',
};

export default function Content() {
  const { user } = useAuth();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('content_pieces').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => setPieces((data as ContentPiece[]) ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conteúdo</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu pipeline de produção de conteúdo</p>
      </div>

      {pieces.length > 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SEO Score</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieces.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell>{p.seo_score != null ? `${p.seo_score}%` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.updated_at).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum conteúdo ainda. Crie conteúdo a partir de suas keywords.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

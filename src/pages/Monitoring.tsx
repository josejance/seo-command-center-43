import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity } from 'lucide-react';

interface HistoryEntry {
  id: string;
  api_endpoint: string | null;
  cost_credits: number | null;
  executed_at: string;
}

export default function Monitoring() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('research_history').select('*').order('executed_at', { ascending: false }).limit(50)
      .then(({ data }) => setHistory((data as HistoryEntry[]) ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoramento</h1>
        <p className="text-muted-foreground mt-1">Histórico de pesquisas e uso de créditos</p>
      </div>

      {history.length > 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-sm">{h.api_endpoint ?? '—'}</TableCell>
                    <TableCell>{h.cost_credits ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(h.executed_at).toLocaleString('pt-BR')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum histórico de pesquisa ainda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

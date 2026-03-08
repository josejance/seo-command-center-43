import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function Analysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise SERP</h1>
        <p className="text-muted-foreground mt-1">Visualize resultados de busca e métricas da concorrência</p>
      </div>
      <Card className="border-dashed border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Selecione uma keyword com dados SERP para visualizar a análise.</p>
          <p className="text-sm text-muted-foreground mt-1">Os resultados aparecerão aqui após a coleta de dados.</p>
        </CardContent>
      </Card>
    </div>
  );
}

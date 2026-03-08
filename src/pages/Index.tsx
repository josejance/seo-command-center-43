import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Search, FileText, Activity } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, keywords: 0, content: 0, researches: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [{ count: projects }, { count: keywords }, { count: content }, { count: researches }] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('keywords').select('*', { count: 'exact', head: true }),
        supabase.from('content_pieces').select('*', { count: 'exact', head: true }),
        supabase.from('research_history').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        projects: projects ?? 0,
        keywords: keywords ?? 0,
        content: content ?? 0,
        researches: researches ?? 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { label: 'Projetos', value: stats.projects, icon: FolderKanban, color: 'text-primary' },
    { label: 'Keywords', value: stats.keywords, icon: Search, color: 'text-chart-2' },
    { label: 'Conteúdos', value: stats.content, icon: FileText, color: 'text-chart-3' },
    { label: 'Pesquisas', value: stats.researches, icon: Activity, color: 'text-chart-4' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu SEO Command Center</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Começar</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2">
          <p>1. Crie um <strong className="text-foreground">Projeto</strong> para organizar suas pesquisas</p>
          <p>2. Adicione <strong className="text-foreground">Keywords</strong> para análise</p>
          <p>3. Analise os <strong className="text-foreground">resultados SERP</strong> da concorrência</p>
          <p>4. Produza <strong className="text-foreground">Conteúdo</strong> otimizado para SEO</p>
        </CardContent>
      </Card>
    </div>
  );
}

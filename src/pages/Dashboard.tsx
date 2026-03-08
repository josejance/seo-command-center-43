import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderKanban, Search, TrendingUp, Clock,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  search_intent: string | null;
  keyword_difficulty: number | null;
  created_at: string;
}

interface ResearchEntry {
  id: string;
  executed_at: string;
  keyword_id: string | null;
  api_endpoint: string | null;
  keywords?: { keyword: string } | null;
}

const INTENT_COLORS: Record<string, string> = {
  informational: 'hsl(200, 70%, 50%)',
  navigational: 'hsl(263, 70%, 50%)',
  commercial: 'hsl(40, 90%, 55%)',
  transactional: 'hsl(150, 60%, 45%)',
  unknown: 'hsl(0, 0%, 45%)',
};

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  navigational: 'bg-primary/20 text-primary',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
};

const DIFFICULTY_RANGES = [
  { label: 'Fácil (0-30)', min: 0, max: 30, color: 'hsl(150, 60%, 45%)' },
  { label: 'Médio (31-60)', min: 31, max: 60, color: 'hsl(40, 90%, 55%)' },
  { label: 'Difícil (61-80)', min: 61, max: 80, color: 'hsl(340, 65%, 55%)' },
  { label: 'Muito Difícil (81-100)', min: 81, max: 100, color: 'hsl(0, 63%, 51%)' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [projectCount, setProjectCount] = useState(0);
  const [lastProject, setLastProject] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [recentResearch, setRecentResearch] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, projectsRes, lastProjRes, keywordsRes, researchRes] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', user.id).single(),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('name').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('keywords').select('id, keyword, search_volume, search_intent, keyword_difficulty, created_at'),
        supabase.from('research_history').select('id, executed_at, keyword_id, api_endpoint, keywords(keyword)').order('executed_at', { ascending: false }).limit(5),
      ]);
      setDisplayName(profileRes.data?.display_name ?? user.email ?? '');
      setProjectCount(projectsRes.count ?? 0);
      setLastProject(lastProjRes.data?.name ?? null);
      setKeywords((keywordsRes.data as Keyword[]) ?? []);
      setRecentResearch((researchRes.data as unknown as ResearchEntry[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Keywords por dia (últimos 30 dias)
  const kwByDay = (() => {
    const now = new Date();
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    keywords.forEach(kw => {
      const day = kw.created_at.slice(0, 10);
      if (days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5),
      keywords: count,
    }));
  })();

  // Intent distribution
  const intentData = (() => {
    const counts: Record<string, number> = {};
    keywords.forEach(kw => {
      const intent = kw.search_intent?.toLowerCase() || 'unknown';
      counts[intent] = (counts[intent] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: INTENT_COLORS[name] || INTENT_COLORS.unknown,
    }));
  })();

  // Top 10 keywords by volume
  const topKeywords = [...keywords]
    .filter(kw => kw.search_volume != null)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 10);

  // Difficulty distribution
  const difficultyData = DIFFICULTY_RANGES.map(range => ({
    ...range,
    count: keywords.filter(kw =>
      kw.keyword_difficulty != null &&
      kw.keyword_difficulty >= range.min &&
      kw.keyword_difficulty <= range.max
    ).length,
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-card border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 opacity-5" style={{ background: 'linear-gradient(135deg, hsl(263 70% 50%), hsl(200 70% 50%))' }} />
        <CardContent className="pt-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                Bem-vindo, <span className="text-primary">{displayName}</span>
              </h1>
              <p className="text-muted-foreground mt-1">Aqui está o resumo do seu SEO Command Center</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{projectCount}</div>
                <div className="text-muted-foreground flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5" />Projetos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{keywords.length}</div>
                <div className="text-muted-foreground flex items-center gap-1"><Search className="h-3.5 w-3.5" />Keywords</div>
              </div>
              {lastProject && (
                <div className="text-center">
                  <div className="text-sm font-semibold text-primary truncate max-w-[120px]">{lastProject}</div>
                  <div className="text-muted-foreground text-xs">Último projeto</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keywords por dia */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Keywords analisadas por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kwByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(240 5% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(240 5% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(240 6% 6%)', border: '1px solid hsl(240 4% 16%)', borderRadius: 8, color: 'hsl(0 0% 95%)' }}
                  />
                  <Line type="monotone" dataKey="keywords" stroke="hsl(263, 70%, 50%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Intent Distribution */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Intent</CardTitle>
          </CardHeader>
          <CardContent>
            {intentData.length > 0 ? (
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={intentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {intentData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(240 6% 6%)', border: '1px solid hsl(240 4% 16%)', borderRadius: 8, color: 'hsl(0 0% 95%)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de intent ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Keywords */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Keywords por Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {topKeywords.length > 0 ? (
              <div className="space-y-3">
                {topKeywords.map((kw, i) => (
                  <div key={kw.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                      <span className="text-sm truncate">{kw.keyword}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={INTENT_BADGE[kw.search_intent?.toLowerCase() ?? ''] ?? 'bg-muted text-muted-foreground'}>
                        {kw.search_intent ?? '—'}
                      </Badge>
                      <span className="text-sm font-mono font-semibold w-16 text-right">{kw.search_volume?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de volume ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Keywords por Dificuldade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={difficultyData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(240 5% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fill: 'hsl(240 5% 60%)', fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip contentStyle={{ background: 'hsl(240 6% 6%)', border: '1px solid hsl(240 4% 16%)', borderRadius: 8, color: 'hsl(0 0% 95%)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {difficultyData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Research */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Últimas Pesquisas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentResearch.length > 0 ? (
            <div className="space-y-4">
              {recentResearch.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    {i < recentResearch.length - 1 && (
                      <div className="absolute top-3 left-1 w-px h-8 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{entry.keywords?.keyword ?? 'Pesquisa'}</span>
                      {entry.api_endpoint && (
                        <span className="text-muted-foreground ml-2 text-xs font-mono">{entry.api_endpoint}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.executed_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma pesquisa realizada ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

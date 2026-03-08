import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft, ArrowUp, ArrowDown, Minus, Loader2, Activity, TrendingUp, TrendingDown,
  Clock, DollarSign, RefreshCw, AlertTriangle, ChevronDown, CalendarIcon, GitCompareArrows
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  monitored: boolean;
}

interface RankEntry {
  keyword_id: string;
  position: number | null;
  url: string | null;
  checked_at: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  read: boolean;
  created_at: string;
  keyword_id: string | null;
}

interface HistoryEntry {
  id: string;
  api_endpoint: string | null;
  cost_credits: number | null;
  executed_at: string;
  raw_response: any;
  keyword_id: string | null;
}

const CHART_COLORS = [
  'hsl(263, 70%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(150, 60%, 45%)',
  'hsl(30, 80%, 55%)', 'hsl(340, 65%, 50%)', 'hsl(180, 60%, 45%)',
  'hsl(60, 70%, 50%)', 'hsl(100, 60%, 45%)', 'hsl(280, 60%, 55%)',
  'hsl(220, 70%, 55%)',
];

export default function ProjectMonitoring() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rankData, setRankData] = useState<Record<string, RankEntry[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [targetDomain, setTargetDomain] = useState('');
  const [projectName, setProjectName] = useState('');
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [frequency, setFrequency] = useState<string>('weekly');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  // Temporal comparison state
  const [compareDate1, setCompareDate1] = useState<Date | undefined>();
  const [compareDate2, setCompareDate2] = useState<Date | undefined>();

  const loadData = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);

    const [projRes, kwRes, alertRes, histRes] = await Promise.all([
      supabase.from('projects').select('name').eq('id', id).single(),
      supabase.from('keywords').select('id, keyword, search_volume, monitored').eq('project_id', id),
      supabase.from('alerts').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('research_history').select('*').eq('project_id', id).order('executed_at', { ascending: false }).limit(100),
    ]);

    setProjectName(projRes.data?.name ?? '');
    const kws = (kwRes.data as any[]) ?? [];
    setKeywords(kws);
    setAlerts((alertRes.data as Alert[]) ?? []);
    setHistory((histRes.data as HistoryEntry[]) ?? []);

    // Load domain + frequency from settings
    const { data: settings } = await supabase.from('app_settings')
      .select('setting_key, setting_value')
      .eq('user_id', user.id)
      .in('setting_key', [`monitoring_domain_${id}`, `monitoring_frequency_${id}`]);

    (settings ?? []).forEach((s: any) => {
      if (s.setting_key === `monitoring_domain_${id}`) setTargetDomain(s.setting_value);
      if (s.setting_key === `monitoring_frequency_${id}`) setFrequency(s.setting_value);
    });

    // Load rank history for monitored keywords
    const monitoredIds = kws.filter((k: any) => k.monitored).map((k: any) => k.id);
    if (monitoredIds.length > 0) {
      const { data: ranks } = await supabase
        .from('rank_history')
        .select('keyword_id, position, url, checked_at')
        .in('keyword_id', monitoredIds)
        .order('checked_at', { ascending: true });

      const grouped: Record<string, RankEntry[]> = {};
      (ranks ?? []).forEach((r: any) => {
        if (!grouped[r.keyword_id]) grouped[r.keyword_id] = [];
        grouped[r.keyword_id].push(r);
      });
      setRankData(grouped);
    }

    setLoading(false);
  }, [user, id]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleMonitored = async (kwId: string, val: boolean) => {
    await supabase.from('keywords').update({ monitored: val } as any).eq('id', kwId);
    setKeywords(prev => prev.map(k => k.id === kwId ? { ...k, monitored: val } : k));
  };

  const saveDomain = async () => {
    if (!user || !id) return;
    await supabase.from('app_settings').upsert(
      { user_id: user.id, setting_key: `monitoring_domain_${id}`, setting_value: targetDomain, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,setting_key' }
    );
    toast.success('Domínio salvo!');
  };

  const saveFrequency = async (val: string) => {
    if (!user || !id) return;
    setFrequency(val);
    await supabase.from('app_settings').upsert(
      { user_id: user.id, setting_key: `monitoring_frequency_${id}`, setting_value: val, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,setting_key' }
    );
    toast.success(`Frequência salva: ${val === 'daily' ? 'Diário' : val === 'weekly' ? 'Semanal' : 'Mensal'}`);
  };

  const checkRankings = async () => {
    if (!targetDomain.trim()) { toast.error('Configure o domínio alvo primeiro'); return; }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-rankings', {
        body: { project_id: id, target_domain: targetDomain },
      });
      if (error) throw error;
      toast.success(`Rankings verificados! ${data.results?.length ?? 0} keywords processadas`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar rankings');
    }
    setChecking(false);
  };

  const markAlertRead = async (alertId: string) => {
    await supabase.from('alerts').update({ read: true }).eq('id', alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
  };

  // Build chart data
  const monitoredKeywords = keywords.filter(k => k.monitored);
  const chartData = buildChartData(monitoredKeywords, rankData);
  const latestRanks = getLatestRanks(monitoredKeywords, rankData);

  // Alert filters
  let filteredAlerts = alerts;
  if (alertFilter !== 'all') filteredAlerts = filteredAlerts.filter(a => a.type === alertFilter);
  if (severityFilter !== 'all') filteredAlerts = filteredAlerts.filter(a => a.severity === severityFilter);

  const totalCost = history.reduce((sum, h) => sum + (h.cost_credits ?? 0), 0);

  // Temporal comparison data
  const comparisonData = buildComparisonData(monitoredKeywords, rankData, compareDate1, compareDate2);

  // Enrich history with keyword names
  const keywordMap = Object.fromEntries(keywords.map(k => [k.id, k.keyword]));

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Monitoramento</h1>
          <p className="text-muted-foreground mt-1">{projectName}</p>
        </div>
        <Button onClick={checkRankings} disabled={checking} className="gradient-primary text-primary-foreground">
          {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Verificar Rankings
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Monitoradas', value: monitoredKeywords.length, icon: Activity, color: 'text-primary' },
          { label: 'Alertas Não Lidos', value: alerts.filter(a => !a.read).length, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Verificações', value: history.filter(h => h.api_endpoint?.includes('regular')).length, icon: Clock, color: 'text-chart-2' },
          { label: 'Custo Total', value: `$${totalCost.toFixed(4)}`, icon: DollarSign, color: 'text-chart-3' },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border/50">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="rankings">
        <TabsList>
          <TabsTrigger value="rankings">Rank Tracker</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="alerts">Alertas ({alerts.filter(a => !a.read).length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="compare">Comparativo</TabsTrigger>
        </TabsList>

        {/* RANK TRACKER */}
        <TabsContent value="rankings" className="mt-4 space-y-6">
          {monitoredKeywords.length > 0 ? (
            <>
              {chartData.length > 1 && (
                <Card className="bg-card border-border/50">
                  <CardHeader><CardTitle className="text-lg">Evolução de Posição (Top 10 Keywords)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                        <XAxis dataKey="date" stroke="hsl(240, 5%, 60%)" fontSize={12} />
                        <YAxis reversed domain={[1, 'auto']} stroke="hsl(240, 5%, 60%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(240, 6%, 6%)', border: '1px solid hsl(240, 4%, 16%)', borderRadius: '8px' }}
                          labelStyle={{ color: 'hsl(0, 0%, 95%)' }}
                        />
                        <Legend />
                        {monitoredKeywords.slice(0, 10).map((kw, i) => (
                          <Line key={kw.id} type="monotone" dataKey={kw.keyword} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card border-border/50">
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Posição Atual</TableHead>
                        <TableHead>Posição Anterior</TableHead>
                        <TableHead>Variação</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>URL Ranqueada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latestRanks.map(r => (
                        <TableRow key={r.keyword_id}>
                          <TableCell className="font-medium">{r.keyword}</TableCell>
                          <TableCell className="font-mono">{r.current ?? '—'}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{r.previous ?? '—'}</TableCell>
                          <TableCell>
                            {r.variation !== null ? (
                              <div className={`flex items-center gap-1 font-mono text-sm ${
                                r.variation > 0 ? 'text-chart-3' : r.variation < 0 ? 'text-destructive' : 'text-muted-foreground'
                              }`}>
                                {r.variation > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : r.variation < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                {r.variation !== 0 ? Math.abs(r.variation) : '0'}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{r.volume?.toLocaleString() ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.url ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma keyword monitorada. Vá em Configuração para selecionar keywords.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CONFIG */}
        <TabsContent value="config" className="mt-4 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Domínio Alvo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Informe o domínio que você quer monitorar nos resultados da SERP.</p>
              <div className="flex gap-2">
                <Input value={targetDomain} onChange={e => setTargetDomain(e.target.value)} placeholder="ex: meusite.com.br" className="max-w-md" />
                <Button onClick={saveDomain} variant="outline">Salvar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Frequência de Monitoramento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Defina com que frequência os rankings devem ser verificados. A verificação automática requer configuração de cron job.
              </p>
              <Select value={frequency} onValueChange={saveFrequency}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Frequência atual: <span className="font-medium text-foreground">{frequency === 'daily' ? 'Diário' : frequency === 'weekly' ? 'Semanal' : 'Mensal'}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Keywords para Monitorar</CardTitle></CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Monitor</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords.map(kw => (
                      <TableRow key={kw.id}>
                        <TableCell>
                          <Checkbox checked={kw.monitored} onCheckedChange={(val) => toggleMonitored(kw.id, !!val)} />
                        </TableCell>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell className="font-mono text-sm">{kw.search_volume?.toLocaleString() ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma keyword neste projeto.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="rank_drop">Queda de Posição</SelectItem>
                <SelectItem value="rank_improvement">Melhoria de Posição</SelectItem>
                <SelectItem value="new_competitor">Novo Competidor</SelectItem>
                <SelectItem value="keyword_trend">Tendência</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas severidades</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAlerts.length > 0 ? (
            <div className="space-y-2">
              {filteredAlerts.map(alert => (
                <Card
                  key={alert.id}
                  className={`bg-card border-border/50 cursor-pointer transition-opacity ${alert.read ? 'opacity-60' : ''}`}
                  onClick={() => !alert.read && markAlertRead(alert.id)}
                >
                  <CardContent className="py-3 flex items-center gap-3">
                    {alert.type === 'rank_drop' ? (
                      <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0" />
                    ) : alert.type === 'rank_improvement' ? (
                      <TrendingUp className="h-5 w-5 text-chart-3 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-chart-4 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <Badge variant="outline" className={
                      alert.severity === 'critical' ? 'border-destructive text-destructive' :
                      alert.severity === 'high' ? 'border-destructive/60 text-destructive' :
                      alert.severity === 'medium' ? 'border-chart-4 text-chart-4' :
                      'border-muted-foreground text-muted-foreground'
                    }>
                      {alert.severity}
                    </Badge>
                    {!alert.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum alerta encontrado.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-chart-3" />
                Custo Total: ${totalCost.toFixed(4)}
              </CardTitle>
            </CardHeader>
          </Card>

          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map(h => {
                const raw = h.raw_response;
                const results = raw?.results ?? [];
                const histAlerts = raw?.alerts ?? [];
                const kwName = h.keyword_id ? keywordMap[h.keyword_id] : null;
                const isExpanded = expandedHistory === h.id;

                return (
                  <Collapsible key={h.id} open={isExpanded} onOpenChange={() => setExpandedHistory(isExpanded ? null : h.id)}>
                    <Card className="bg-card border-border/50">
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-3 flex items-center gap-4 cursor-pointer hover:bg-muted/20 transition-colors">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{kwName ?? h.api_endpoint ?? 'N/A'}</p>
                              {h.api_endpoint && (
                                <Badge variant="outline" className="text-[10px]">{h.api_endpoint}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{new Date(h.executed_at).toLocaleString('pt-BR')}</p>
                          </div>
                          <Badge variant="secondary">{h.cost_credits != null ? `$${h.cost_credits.toFixed(4)}` : '—'}</Badge>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-4 space-y-3">
                          {results.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Resultados:</p>
                              <div className="space-y-1">
                                {results.map((r: any, i: number) => (
                                  <div key={i} className="flex items-center gap-3 text-sm">
                                    <span className="font-medium min-w-[150px]">{r.keyword}</span>
                                    <span className="font-mono text-muted-foreground">
                                      Pos: {r.position ?? 'N/R'}
                                    </span>
                                    {r.url && (
                                      <span className="text-xs text-muted-foreground truncate max-w-[250px]">{r.url}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {histAlerts.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Alertas gerados:</p>
                              {histAlerts.map((a: any, i: number) => (
                                <div key={i} className={`text-sm flex items-center gap-2 ${a.type === 'rank_improvement' ? 'text-chart-3' : 'text-destructive'}`}>
                                  {a.type === 'rank_improvement' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                  {a.message}
                                </div>
                              ))}
                            </div>
                          )}
                          {results.length === 0 && histAlerts.length === 0 && (
                            <p className="text-xs text-muted-foreground">Sem dados detalhados disponíveis para esta execução.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum histórico ainda.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TEMPORAL COMPARISON */}
        <TabsContent value="compare" className="mt-4 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitCompareArrows className="h-5 w-5 text-primary" />
                Comparativo Temporal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Selecione duas datas para comparar as posições de ranking das keywords monitoradas.</p>
              <div className="flex items-end gap-4">
                <div className="space-y-2">
                  <Label>Data 1</Label>
                  <DatePicker date={compareDate1} onSelect={setCompareDate1} />
                </div>
                <div className="space-y-2">
                  <Label>Data 2</Label>
                  <DatePicker date={compareDate2} onSelect={setCompareDate2} />
                </div>
              </div>
            </CardContent>
          </Card>

          {compareDate1 && compareDate2 && comparisonData.length > 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-center">{format(compareDate1, 'dd/MM/yyyy')}</TableHead>
                      <TableHead className="text-center">{format(compareDate2, 'dd/MM/yyyy')}</TableHead>
                      <TableHead className="text-center">Variação</TableHead>
                      <TableHead>URL (Data 1)</TableHead>
                      <TableHead>URL (Data 2)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map(row => {
                      const diff = (row.pos1 !== null && row.pos2 !== null) ? row.pos1 - row.pos2 : null;
                      return (
                        <TableRow key={row.keyword_id}>
                          <TableCell className="font-medium">{row.keyword}</TableCell>
                          <TableCell className="text-center font-mono">{row.pos1 ?? 'N/R'}</TableCell>
                          <TableCell className="text-center font-mono">{row.pos2 ?? 'N/R'}</TableCell>
                          <TableCell className="text-center">
                            {diff !== null ? (
                              <div className={`flex items-center justify-center gap-1 font-mono text-sm ${
                                diff > 0 ? 'text-chart-3' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                              }`}>
                                {diff > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : diff < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                {diff !== 0 ? Math.abs(diff) : '0'}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{row.url1 ?? '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{row.url2 ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : compareDate1 && compareDate2 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitCompareArrows className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Sem dados de ranking para as datas selecionadas.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// DatePicker component
function DatePicker({ date, onSelect }: { date: Date | undefined; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

// Helper: build chart data from rank history
function buildChartData(keywords: Keyword[], rankData: Record<string, RankEntry[]>) {
  const allDates = new Set<string>();
  Object.values(rankData).forEach(entries =>
    entries.forEach(e => allDates.add(new Date(e.checked_at).toLocaleDateString('pt-BR')))
  );
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  return sortedDates.map(date => {
    const point: Record<string, any> = { date };
    keywords.slice(0, 10).forEach(kw => {
      const entries = rankData[kw.id] ?? [];
      const match = entries.find(e => new Date(e.checked_at).toLocaleDateString('pt-BR') === date);
      point[kw.keyword] = match?.position ?? null;
    });
    return point;
  });
}

// Helper: get latest and previous ranks
function getLatestRanks(keywords: Keyword[], rankData: Record<string, RankEntry[]>) {
  return keywords.map(kw => {
    const entries = rankData[kw.id] ?? [];
    const latest = entries[entries.length - 1];
    const prev = entries.length >= 2 ? entries[entries.length - 2] : null;
    const current = latest?.position ?? null;
    const previous = prev?.position ?? null;
    let variation: number | null = null;
    if (current !== null && previous !== null) variation = previous - current;
    return { keyword_id: kw.id, keyword: kw.keyword, current, previous, variation, volume: kw.search_volume, url: latest?.url ?? null };
  });
}

// Helper: build comparison data for two dates
function buildComparisonData(keywords: Keyword[], rankData: Record<string, RankEntry[]>, date1?: Date, date2?: Date) {
  if (!date1 || !date2) return [];

  const d1str = date1.toLocaleDateString('pt-BR');
  const d2str = date2.toLocaleDateString('pt-BR');

  return keywords.map(kw => {
    const entries = rankData[kw.id] ?? [];
    const match1 = entries.find(e => new Date(e.checked_at).toLocaleDateString('pt-BR') === d1str);
    const match2 = entries.find(e => new Date(e.checked_at).toLocaleDateString('pt-BR') === d2str);

    return {
      keyword_id: kw.id,
      keyword: kw.keyword,
      pos1: match1?.position ?? null,
      pos2: match2?.position ?? null,
      url1: match1?.url ?? null,
      url2: match2?.url ?? null,
    };
  }).filter(r => r.pos1 !== null || r.pos2 !== null);
}

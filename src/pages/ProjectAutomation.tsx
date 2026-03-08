import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Plus, Loader2, Calendar, Clock, Zap, Upload, Webhook, Download,
  Play, Trash2, CheckCircle2, XCircle, Circle, FileJson, FileSpreadsheet, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csv';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
}

interface Schedule {
  id: string;
  keywords: any;
  apis: any;
  frequency: string;
  schedule_time: string | null;
  schedule_day: number | null;
  next_run: string | null;
  last_run: string | null;
  active: boolean;
  created_at: string;
}

interface PipelineConfig {
  id: string;
  name: string;
  min_score: number;
  steps: PipelineStep[];
  active: boolean;
}

interface PipelineStep {
  name: string;
  label: string;
  auto: boolean;
}

interface AutomationLog {
  id: string;
  action: string;
  status: string;
  details: any;
  created_at: string;
}

const API_OPTIONS = [
  { id: 'serp', label: 'SERP (Google Orgânico)' },
  { id: 'related', label: 'Keywords Relacionadas' },
  { id: 'suggestions', label: 'Sugestões' },
  { id: 'autocomplete', label: 'Autocomplete' },
  { id: 'subtopics', label: 'Subtópicos' },
];

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Uma vez',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export default function ProjectAutomation() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule form
  const [selKws, setSelKws] = useState<string[]>([]);
  const [allKws, setAllKws] = useState(true);
  const [selApis, setSelApis] = useState<string[]>(['serp']);
  const [freq, setFreq] = useState('once');
  const [schedTime, setSchedTime] = useState('08:00');
  const [schedDay, setSchedDay] = useState<number>(1);
  const [savingSched, setSavingSched] = useState(false);

  // Bulk
  const [bulkText, setBulkText] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; results: any[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['research_complete']);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);

    const [projRes, kwRes, schedRes, pipeRes, logRes] = await Promise.all([
      supabase.from('projects').select('name').eq('id', id).single(),
      supabase.from('keywords').select('id, keyword, search_volume').eq('project_id', id),
      supabase.from('schedules').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('pipeline_configs').select('*').eq('project_id', id),
      supabase.from('automation_logs').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(50),
    ]);

    setProjectName(projRes.data?.name ?? '');
    setKeywords((kwRes.data as any[]) ?? []);
    setSchedules((schedRes.data as Schedule[]) ?? []);
    setPipelines((pipeRes.data ?? []).map((p: any) => ({ ...p, steps: (typeof p.steps === 'string' ? JSON.parse(p.steps) : p.steps) as PipelineStep[] })));
    setLogs((logRes.data as AutomationLog[]) ?? []);

    // Load webhook URL
    const { data: whSetting } = await supabase.from('app_settings')
      .select('setting_value')
      .eq('user_id', user.id)
      .eq('setting_key', `webhook_url_${id}`)
      .single();
    if (whSetting) setWebhookUrl(whSetting.setting_value);

    const { data: whEvents } = await supabase.from('app_settings')
      .select('setting_value')
      .eq('user_id', user.id)
      .eq('setting_key', `webhook_events_${id}`)
      .single();
    if (whEvents) {
      try { setWebhookEvents(JSON.parse(whEvents.setting_value)); } catch {}
    }

    setLoading(false);
  }, [user, id]);

  useEffect(() => { loadData(); }, [loadData]);

  // === SCHEDULES ===
  const createSchedule = async () => {
    if (!id) return;
    setSavingSched(true);
    const kwPayload = allKws ? ['__all__'] : selKws;
    const now = new Date();
    let nextRun: string | null = null;

    if (freq === 'once') {
      nextRun = now.toISOString();
    } else {
      const [h, m] = schedTime.split(':').map(Number);
      const next = new Date(now);
      next.setHours(h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      nextRun = next.toISOString();
    }

    const { error } = await supabase.from('schedules').insert({
      project_id: id,
      keywords: kwPayload,
      apis: selApis,
      frequency: freq,
      schedule_time: schedTime,
      schedule_day: freq === 'weekly' || freq === 'monthly' ? schedDay : null,
      next_run: nextRun,
    } as any);

    if (error) toast.error(error.message);
    else { toast.success('Agendamento criado!'); await loadData(); }
    setSavingSched(false);
  };

  const toggleSchedule = async (schedId: string, active: boolean) => {
    await supabase.from('schedules').update({ active } as any).eq('id', schedId);
    setSchedules(prev => prev.map(s => s.id === schedId ? { ...s, active } : s));
  };

  const deleteSchedule = async (schedId: string) => {
    await supabase.from('schedules').delete().eq('id', schedId);
    setSchedules(prev => prev.filter(s => s.id !== schedId));
    toast.success('Agendamento removido');
  };

  // === PIPELINE ===
  const createDefaultPipeline = async () => {
    if (!id) return;
    const { error } = await supabase.from('pipeline_configs').insert({
      project_id: id,
      name: 'Pipeline Padrão',
      min_score: 70,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success('Pipeline criado!'); await loadData(); }
  };

  const updatePipelineStep = async (pipeId: string, stepIndex: number, auto: boolean) => {
    const pipe = pipelines.find(p => p.id === pipeId);
    if (!pipe) return;
    const newSteps = [...pipe.steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], auto };
    await supabase.from('pipeline_configs').update({ steps: newSteps } as any).eq('id', pipeId);
    setPipelines(prev => prev.map(p => p.id === pipeId ? { ...p, steps: newSteps } : p));
  };

  const updatePipelineScore = async (pipeId: string, score: number) => {
    await supabase.from('pipeline_configs').update({ min_score: score } as any).eq('id', pipeId);
    setPipelines(prev => prev.map(p => p.id === pipeId ? { ...p, min_score: score } : p));
  };

  // === BULK ===
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      // Skip header if it looks like one
      const firstLine = lines[0]?.toLowerCase();
      const start = (firstLine === 'keyword' || firstLine === 'keywords' || firstLine === 'palavra-chave') ? 1 : 0;
      setBulkText(lines.slice(start).join('\n'));
    };
    reader.readAsText(file);
  };

  const runBulkResearch = async () => {
    const kws = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (kws.length === 0) { toast.error('Adicione pelo menos uma keyword'); return; }

    setBulkRunning(true);
    setBulkProgress({ total: kws.length, done: 0, results: [] });

    try {
      const { data, error } = await supabase.functions.invoke('run-automation', {
        body: { action: 'bulk_research', project_id: id, keywords: kws },
      });

      if (error) throw error;
      setBulkProgress({ total: kws.length, done: kws.length, results: data.results ?? [] });
      toast.success(`Pesquisa em massa concluída! ${kws.length} keywords processadas`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro na pesquisa em massa');
    }
    setBulkRunning(false);
  };

  // === WEBHOOKS ===
  const saveWebhook = async () => {
    if (!user || !id) return;
    setSavingWebhook(true);
    await Promise.all([
      supabase.from('app_settings').upsert(
        { user_id: user.id, setting_key: `webhook_url_${id}`, setting_value: webhookUrl, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,setting_key' }
      ),
      supabase.from('app_settings').upsert(
        { user_id: user.id, setting_key: `webhook_events_${id}`, setting_value: JSON.stringify(webhookEvents), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,setting_key' }
      ),
    ]);
    toast.success('Webhook salvo!');
    setSavingWebhook(false);
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) { toast.error('Configure a URL do webhook'); return; }
    setTestingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-automation', {
        body: {
          action: 'send_webhook',
          project_id: id,
          webhook_url: webhookUrl,
          webhook_event: 'test',
          webhook_payload: { message: 'Teste de webhook do SEO Command' },
        },
      });
      if (error) throw error;
      if (data.success) toast.success(`Webhook enviado! Status: ${data.status}`);
      else toast.error(`Falha: ${data.error || data.status}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setTestingWebhook(false);
  };

  // === EXPORT ===
  const exportProject = async (format: 'json' | 'csv') => {
    if (!id) return;
    const [kwRes, contentRes, rankRes, alertRes] = await Promise.all([
      supabase.from('keywords').select('*').eq('project_id', id),
      supabase.from('content_pieces').select('*'),
      supabase.from('rank_history').select('*'),
      supabase.from('alerts').select('*').eq('project_id', id),
    ]);

    const projectData = {
      project_name: projectName,
      exported_at: new Date().toISOString(),
      keywords: kwRes.data ?? [],
      content_pieces: contentRes.data ?? [],
      rank_history: rankRes.data ?? [],
      alerts: alertRes.data ?? [],
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'projeto'}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exportado!');
    } else {
      exportToCSV(
        (kwRes.data ?? []).map((k: any) => ({
          keyword: k.keyword,
          volume: k.search_volume,
          difficulty: k.keyword_difficulty,
          cpc: k.cpc,
          intent: k.search_intent,
          status: k.status,
          source: k.source_type,
        })),
        `${projectName || 'projeto'}_keywords`
      );
      toast.success('CSV exportado!');
    }
  };

  const toggleKwSelection = (kwId: string) => {
    setSelKws(prev => prev.includes(kwId) ? prev.filter(k => k !== kwId) : [...prev, kwId]);
  };

  const toggleApi = (apiId: string) => {
    setSelApis(prev => prev.includes(apiId) ? prev.filter(a => a !== apiId) : [...prev, apiId]);
  };

  const toggleWebhookEvent = (ev: string) => {
    setWebhookEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Automação</h1>
          <p className="text-muted-foreground mt-1">{projectName}</p>
        </div>
      </div>

      <Tabs defaultValue="schedules">
        <TabsList className="flex-wrap">
          <TabsTrigger value="schedules">Agendamentos</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="bulk">Pesquisa em Massa</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="export">Exportação</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
        </TabsList>

        {/* SCHEDULES */}
        <TabsContent value="schedules" className="mt-4 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Novo Agendamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Keywords selection */}
              <div className="space-y-2">
                <Label>Keywords</Label>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox checked={allKws} onCheckedChange={(v) => setAllKws(!!v)} />
                  <span className="text-sm">Todas as keywords do projeto ({keywords.length})</span>
                </div>
                {!allKws && (
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                    {keywords.map(kw => (
                      <label key={kw.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/20 rounded p-1">
                        <Checkbox checked={selKws.includes(kw.id)} onCheckedChange={() => toggleKwSelection(kw.id)} />
                        {kw.keyword}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* APIs */}
              <div className="space-y-2">
                <Label>APIs a executar</Label>
                <div className="flex flex-wrap gap-3">
                  {API_OPTIONS.map(api => (
                    <label key={api.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selApis.includes(api.id)} onCheckedChange={() => toggleApi(api.id)} />
                      {api.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={freq} onValueChange={setFreq}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Uma vez</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                </div>
                {(freq === 'weekly' || freq === 'monthly') && (
                  <div className="space-y-2">
                    <Label>{freq === 'weekly' ? 'Dia da semana' : 'Dia do mês'}</Label>
                    {freq === 'weekly' ? (
                      <Select value={String(schedDay)} onValueChange={v => setSchedDay(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input type="number" min={1} max={28} value={schedDay} onChange={e => setSchedDay(Number(e.target.value))} />
                    )}
                  </div>
                )}
              </div>

              <Button onClick={createSchedule} disabled={savingSched} className="gradient-primary text-primary-foreground">
                {savingSched ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar Agendamento
              </Button>
            </CardContent>
          </Card>

          {/* Schedule list */}
          {schedules.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg">Agendamentos Ativos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>APIs</TableHead>
                      <TableHead>Próxima Execução</TableHead>
                      <TableHead>Última Execução</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Switch checked={s.active} onCheckedChange={(v) => toggleSchedule(s.id, v)} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{FREQUENCY_LABELS[s.frequency] ?? s.frequency}</Badge>
                          {s.schedule_time && <span className="text-xs text-muted-foreground ml-1">{s.schedule_time}</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {Array.isArray(s.keywords) && s.keywords[0] === '__all__'
                            ? <Badge variant="secondary">Todas</Badge>
                            : <span>{(s.keywords as string[])?.length ?? 0} keywords</span>}
                        </TableCell>
                        <TableCell className="text-xs">{(s.apis as string[])?.join(', ')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.next_run ? new Date(s.next_run).toLocaleString('pt-BR') : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.last_run ? new Date(s.last_run).toLocaleString('pt-BR') : '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteSchedule(s.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline" className="mt-4 space-y-6">
          {pipelines.length === 0 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum pipeline configurado.</p>
                <Button onClick={createDefaultPipeline} className="gradient-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />Criar Pipeline Padrão
                </Button>
              </CardContent>
            </Card>
          ) : (
            pipelines.map(pipe => (
              <Card key={pipe.id} className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" /> {pipe.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score threshold */}
                  <div className="space-y-3">
                    <Label>Score Mínimo para Auto-geração: <span className="text-primary font-bold">{pipe.min_score}</span></Label>
                    <Slider
                      value={[pipe.min_score]}
                      onValueChange={([v]) => updatePipelineScore(pipe.id, v)}
                      min={0} max={100} step={5}
                      className="max-w-md"
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    <Label>Etapas do Pipeline</Label>
                    <div className="space-y-1">
                      {pipe.steps.map((step, i) => (
                        <div key={step.name} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-muted/10">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{step.auto ? 'Automático' : 'Manual'}</span>
                            <Switch
                              checked={step.auto}
                              onCheckedChange={(v) => updatePipelineStep(pipe.id, i, v)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* BULK RESEARCH */}
        <TabsContent value="bulk" className="mt-4 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" /> Pesquisa em Massa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cole keywords (uma por linha) ou faça upload de um CSV. As keywords serão pesquisadas na DataForSEO respeitando rate limits.
              </p>

              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Upload CSV
                </Button>
              </div>

              <Textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder="seo tools&#10;marketing digital&#10;como rankear no google&#10;..."
                rows={8}
              />

              <div className="flex items-center gap-4">
                <Button onClick={runBulkResearch} disabled={bulkRunning} className="gradient-primary text-primary-foreground">
                  {bulkRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Iniciar Pesquisa
                </Button>
                <span className="text-sm text-muted-foreground">
                  {bulkText.split('\n').filter(l => l.trim()).length} keywords
                </span>
              </div>

              {bulkProgress && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-mono">{bulkProgress.done}/{bulkProgress.total}</span>
                  </div>
                  <Progress value={(bulkProgress.done / bulkProgress.total) * 100} />

                  {bulkProgress.results.length > 0 && (
                    <div className="space-y-1 mt-3">
                      <p className="text-sm font-medium">Resultados:</p>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {bulkProgress.results.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/20">
                            {r.status === 'success' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-chart-3 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                            )}
                            <span className="font-medium">{r.keyword}</span>
                            {r.results_count != null && (
                              <span className="text-muted-foreground text-xs">{r.results_count} resultados</span>
                            )}
                            {r.cost != null && (
                              <span className="text-xs text-muted-foreground ml-auto">${r.cost.toFixed(4)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks" className="mt-4 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" /> Webhook de Saída
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure uma URL de webhook para receber notificações quando eventos ocorrerem (compatível com Slack, Discord, n8n, Zapier).
              </p>

              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/... ou https://discord.com/api/webhooks/..."
                />
              </div>

              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'research_complete', label: 'Pesquisa Concluída' },
                    { id: 'content_generated', label: 'Conteúdo Gerado' },
                    { id: 'rank_alert', label: 'Alerta de Ranking' },
                    { id: 'bulk_complete', label: 'Pesquisa em Massa Concluída' },
                  ].map(ev => (
                    <label key={ev.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={webhookEvents.includes(ev.id)} onCheckedChange={() => toggleWebhookEvent(ev.id)} />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveWebhook} disabled={savingWebhook} variant="outline">
                  {savingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
                <Button onClick={testWebhook} disabled={testingWebhook || !webhookUrl} variant="secondary">
                  {testingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Testar Webhook
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-chart-2" /> Webhook de Entrada (Trigger Externo)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use esta URL para disparar pesquisas remotamente (n8n, Zapier, scripts).
              </p>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Endpoint:</p>
                <code className="text-xs font-mono text-primary break-all">
                  POST {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-automation`}
                </code>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Body (JSON):</p>
                <pre className="text-xs font-mono text-foreground bg-muted/40 p-2 rounded overflow-x-auto">
{`{
  "action": "bulk_research",
  "project_id": "${id}",
  "keywords": ["keyword1", "keyword2"]
}`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Header: <code className="text-primary">Authorization: Bearer YOUR_TOKEN</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPORT */}
        <TabsContent value="export" className="mt-4 space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" /> Exportar Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporte todos os dados do projeto em diferentes formatos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => exportProject('csv')}>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <FileSpreadsheet className="h-10 w-10 text-chart-3 mb-3" />
                    <p className="font-medium text-sm">Planilha CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">Keywords com métricas</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => exportProject('json')}>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <FileJson className="h-10 w-10 text-chart-2 mb-3" />
                    <p className="font-medium text-sm">JSON Completo</p>
                    <p className="text-xs text-muted-foreground mt-1">Todos os dados do projeto</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
                  // Generate a simple text report
                  const report = `# Relatório SEO - ${projectName}\nExportado em: ${new Date().toLocaleString('pt-BR')}\n\nKeywords: ${keywords.length}\n`;
                  const blob = new Blob([report], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${projectName || 'projeto'}_relatorio.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Relatório exportado!');
                }}>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-10 w-10 text-primary mb-3" />
                    <p className="font-medium text-sm">Relatório Markdown</p>
                    <p className="text-xs text-muted-foreground mt-1">Resumo do projeto</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id} className="bg-card border-border/50">
                  <CardContent className="py-3 flex items-center gap-3">
                    {log.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-chart-3 flex-shrink-0" />
                    ) : log.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                      {log.details?.total_keywords && (
                        <p className="text-xs text-muted-foreground">{log.details.total_keywords} keywords · ${log.details.total_cost?.toFixed(4) ?? '0'}</p>
                      )}
                    </div>
                    <Badge variant={log.status === 'completed' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum log de automação ainda.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Plus, Search, MapPin, Globe, Trash2, Rocket, Eye, BarChart3, FileText, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedCard } from '@/components/AnimatedCard';
import { TableSkeleton, CardSkeleton } from '@/components/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type SourceType = 'main' | 'related' | 'suggestion' | 'idea' | 'autocomplete' | 'subtopic' | 'paa';

const sourceColors: Record<SourceType, string> = {
  main: 'bg-primary/20 text-primary',
  related: 'bg-chart-2/20 text-chart-2',
  suggestion: 'bg-chart-3/20 text-chart-3',
  idea: 'bg-chart-4/20 text-chart-4',
  autocomplete: 'bg-chart-5/20 text-chart-5',
  subtopic: 'bg-muted text-muted-foreground',
  paa: 'bg-accent/20 text-accent-foreground',
};

const PAGE_SIZE = 50;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newKeyword, setNewKeyword] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('main');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; keyword: string } | null>(null);
  const [page, setPage] = useState(0);

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: kwData, isLoading: kwLoading } = useQuery({
    queryKey: ['project-keywords', id, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from('keywords')
        .select('*', { count: 'exact' })
        .eq('project_id', id!)
        .order('created_at', { ascending: false })
        .range(from, to);
      return { keywords: data ?? [], total: count ?? 0 };
    },
    enabled: !!user && !!id,
    staleTime: 5 * 60 * 1000,
  });

  const keywords = kwData?.keywords ?? [];
  const totalKeywords = kwData?.total ?? 0;
  const totalPages = Math.ceil(totalKeywords / PAGE_SIZE);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('keywords').insert({
        project_id: id!, keyword: newKeyword.trim(), source_type: sourceType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Keyword adicionada!');
      setNewKeyword('');
      queryClient.invalidateQueries({ queryKey: ['project-keywords', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (kwId: string) => {
      const { error } = await supabase.from('keywords').delete().eq('id', kwId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Keyword removida');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['project-keywords', id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (projLoading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  if (!project) return <div className="text-muted-foreground">Projeto não encontrado.</div>;

  const analyzedCount = keywords.filter((k: any) => k.status !== 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedCard index={0}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold truncate">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{project.target_location}</span>
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{project.target_language}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/automation`)}>
              <Zap className="mr-1.5 h-3.5 w-3.5" />Automação
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/monitor`)}>
              <Activity className="mr-1.5 h-3.5 w-3.5" />Monitor
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/content`)}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />Conteúdo
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/analysis`)}>
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />Análise
            </Button>
            <Button size="sm" onClick={() => navigate(`/projects/${project.id}/research`)} className="gradient-primary text-primary-foreground">
              <Rocket className="mr-1.5 h-3.5 w-3.5" />Pesquisar
            </Button>
          </div>
        </div>
      </AnimatedCard>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Keywords', value: totalKeywords, color: 'text-primary', tip: 'Total de keywords no projeto' },
          { label: 'Analisadas', value: analyzedCount, color: 'text-chart-3', tip: 'Keywords já pesquisadas' },
          { label: 'Pendentes', value: totalKeywords - analyzedCount, color: 'text-chart-4', tip: 'Keywords aguardando análise' },
          { label: 'Conteúdos', value: 0, color: 'text-chart-2', tip: 'Conteúdos gerados' },
        ].map((s, i) => (
          <AnimatedCard key={s.label} index={i + 1}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-card border-border/50">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>{s.tip}</TooltipContent>
            </Tooltip>
          </AnimatedCard>
        ))}
      </div>

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="add">Adicionar</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <AnimatedCard>
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg">Adicionar Keywords</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kw-input">Keyword</Label>
                    <Input
                      id="kw-input"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      placeholder="ex: seo tools"
                      onKeyDown={e => e.key === 'Enter' && addMutation.mutate()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kw-type">Tipo</Label>
                    <Select value={sourceType} onValueChange={v => setSourceType(v as SourceType)}>
                      <SelectTrigger id="kw-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['main','related','suggestion','idea','autocomplete','subtopic','paa'] as SourceType[]).map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => addMutation.mutate()} className="gradient-primary text-primary-foreground" disabled={addMutation.isPending}>
                  <Plus className="mr-2 h-4 w-4" />{addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          {kwLoading ? (
            <Card className="bg-card border-border/50"><CardContent className="pt-6"><TableSkeleton rows={8} cols={7} /></CardContent></Card>
          ) : keywords.length > 0 ? (
            <AnimatedCard>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-6">
                  <div className="overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="hidden sm:table-cell">Volume</TableHead>
                          <TableHead className="hidden sm:table-cell">KD</TableHead>
                          <TableHead className="hidden md:table-cell">CPC</TableHead>
                          <TableHead className="hidden md:table-cell">Intent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keywords.map((kw: any) => (
                          <TableRow key={kw.id} className="group cursor-pointer hover:bg-muted/20" onClick={() => kw.source_type === 'main' && kw.status === 'analyzed' ? navigate(`/projects/${id}/research/${kw.id}`) : undefined}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 max-w-[200px] sm:max-w-none">
                                {kw.source_type === 'main' && kw.status === 'analyzed' && <Eye className="h-3.5 w-3.5 text-primary shrink-0" />}
                                <span className="truncate">{kw.keyword}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className={sourceColors[kw.source_type as SourceType]}>{kw.source_type}</Badge></TableCell>
                            <TableCell className="font-mono text-sm hidden sm:table-cell">{kw.search_volume?.toLocaleString() ?? '—'}</TableCell>
                            <TableCell className="font-mono text-sm hidden sm:table-cell">{kw.keyword_difficulty != null ? `${kw.keyword_difficulty}%` : '—'}</TableCell>
                            <TableCell className="font-mono text-sm hidden md:table-cell">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</TableCell>
                            <TableCell className="text-sm hidden md:table-cell">{kw.search_intent ?? '—'}</TableCell>
                            <TableCell><Badge variant="secondary">{kw.status}</Badge></TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon"
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: kw.id, keyword: kw.keyword }); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                                    aria-label={`Excluir keyword ${kw.keyword}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir keyword</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalKeywords)} de {totalKeywords}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>
          ) : (
            <EmptyState
              icon={Search}
              title="Nenhuma keyword neste projeto"
              description="Adicione keywords manualmente ou use a pesquisa automática para descobrir oportunidades."
              actionLabel="Pesquisar Keywords"
              onAction={() => navigate(`/projects/${id}/research`)}
            />
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Excluir Keyword"
        description={`Tem certeza que deseja excluir "${deleteTarget?.keyword}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

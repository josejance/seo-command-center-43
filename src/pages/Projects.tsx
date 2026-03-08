import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FolderKanban, Trash2, MapPin, Globe, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedCard } from '@/components/AnimatedCard';
import { CardSkeleton } from '@/components/TableSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const COUNTRIES = [
  'Brazil', 'United States', 'Portugal', 'United Kingdom', 'Spain',
  'Germany', 'France', 'Italy', 'Mexico', 'Argentina', 'Colombia',
  'Canada', 'Australia', 'India', 'Japan',
];

const LANGUAGES = [
  'Portuguese', 'English', 'Spanish', 'German', 'French',
  'Italian', 'Japanese', 'Hindi', 'Dutch', 'Russian',
];

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Brazil');
  const [language, setLanguage] = useState('Portuguese');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data: projectsData } = await supabase
        .from('projects').select('*').order('created_at', { ascending: false });
      if (!projectsData) return [];
      const projectIds = projectsData.map(p => p.id);
      const { data: keywordsData } = await supabase
        .from('keywords').select('project_id').in('project_id', projectIds);
      const counts: Record<string, number> = {};
      keywordsData?.forEach(kw => { counts[kw.project_id] = (counts[kw.project_id] || 0) + 1; });
      return projectsData.map(p => ({ ...p, keyword_count: counts[p.id] || 0 }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('projects').insert({
        name, target_location: location, target_language: language, user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Projeto criado!');
      setOpen(false);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Projeto excluído');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie seus projetos de SEO</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Projeto</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proj-name">Nome do projeto</Label>
                <Input id="proj-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Blog SEO Brasil" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-location">Localização alvo</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="proj-location"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-language">Idioma alvo</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="proj-language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Projeto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para começar a pesquisar keywords e gerar conteúdo otimizado."
          actionLabel="Criar Projeto"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p: any, i: number) => (
            <AnimatedCard key={p.id} index={i}>
              <Card
                className="bg-card border-border/50 hover:border-primary/40 hover:shadow-glow/20 transition-all duration-300 cursor-pointer group h-full"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); }}
                        className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Excluir projeto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir projeto</TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{p.target_location}</div>
                    <div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{p.target_language}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Search className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold">{p.keyword_count}</span>
                      <span className="text-muted-foreground">keywords</span>
                    </div>
                    <Badge variant="outline" className={p.keyword_count > 0 ? 'bg-chart-3/20 text-chart-3' : 'bg-muted text-muted-foreground'}>
                      {p.keyword_count > 0 ? 'Ativo' : 'Novo'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Excluir Projeto"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Todas as keywords, pesquisas e conteúdos associados serão perdidos.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

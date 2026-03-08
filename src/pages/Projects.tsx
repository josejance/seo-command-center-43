import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FolderKanban, Trash2, MapPin, Globe, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  target_location: string;
  target_language: string;
  created_at: string;
  keyword_count?: number;
}

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Brazil');
  const [language, setLanguage] = useState('Portuguese');

  const fetchProjects = async () => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!projectsData) { setProjects([]); setLoading(false); return; }

    // Fetch keyword counts per project
    const projectIds = projectsData.map(p => p.id);
    const { data: keywordsData } = await supabase
      .from('keywords')
      .select('project_id')
      .in('project_id', projectIds);

    const counts: Record<string, number> = {};
    keywordsData?.forEach(kw => {
      counts[kw.project_id] = (counts[kw.project_id] || 0) + 1;
    });

    setProjects(projectsData.map(p => ({ ...p, keyword_count: counts[p.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { if (user) fetchProjects(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('projects').insert({
      name, target_location: location, target_language: language, user_id: user!.id,
    });
    if (error) toast.error(error.message);
    else { toast.success('Projeto criado!'); setOpen(false); setName(''); fetchProjects(); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Projeto excluído'); fetchProjects(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus projetos de SEO</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Novo Projeto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Projeto</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do projeto</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Blog SEO Brasil" required />
              </div>
              <div className="space-y-2">
                <Label>Localização alvo</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idioma alvo</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Criar Projeto</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum projeto ainda. Crie o primeiro!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Card
              key={p.id}
              className="bg-card border-border/50 hover:border-primary/40 hover:shadow-glow/20 transition-all duration-300 cursor-pointer group"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, p.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                  <Badge variant="outline" className={p.keyword_count! > 0 ? 'bg-chart-3/20 text-chart-3' : 'bg-muted text-muted-foreground'}>
                    {p.keyword_count! > 0 ? 'Ativo' : 'Novo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, FolderKanban, Trash2, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  target_location: string;
  target_language: string;
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Brazil');
  const [language, setLanguage] = useState('Portuguese');

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects(data ?? []);
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

  const handleDelete = async (id: string) => {
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
              <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Localização alvo</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
              <div className="space-y-2"><Label>Idioma alvo</Label><Input value={language} onChange={e => setLanguage(e.target.value)} /></div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum projeto ainda. Crie o primeiro!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Card key={p.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{p.target_location}</div>
                <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />{p.target_language}</div>
                <div className="text-xs">{new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

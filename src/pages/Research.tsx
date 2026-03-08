import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Project { id: string; name: string; }
type SourceType = 'main' | 'related' | 'suggestion' | 'idea' | 'autocomplete' | 'subtopic' | 'paa';

interface Keyword {
  id: string;
  keyword: string;
  source_type: SourceType;
  search_volume: number | null;
  keyword_difficulty: number | null;
  status: string;
  created_at: string;
}

const sourceColors: Record<SourceType, string> = {
  main: 'bg-primary/20 text-primary',
  related: 'bg-chart-2/20 text-chart-2',
  suggestion: 'bg-chart-3/20 text-chart-3',
  idea: 'bg-chart-4/20 text-chart-4',
  autocomplete: 'bg-chart-5/20 text-chart-5',
  subtopic: 'bg-muted text-muted-foreground',
  paa: 'bg-accent/20 text-accent',
};

export default function Research() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('main');

  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('id, name').then(({ data }) => {
      setProjects(data ?? []);
      if (data?.[0]) setSelectedProject(data[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedProject) return;
    supabase.from('keywords').select('*').eq('project_id', selectedProject).order('created_at', { ascending: false })
      .then(({ data }) => setKeywords((data as Keyword[]) ?? []));
  }, [selectedProject]);

  const addKeyword = async () => {
    if (!newKeyword.trim() || !selectedProject) return;
    const { error } = await supabase.from('keywords').insert({
      project_id: selectedProject, keyword: newKeyword.trim(), source_type: sourceType,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Keyword adicionada!');
      setNewKeyword('');
      const { data } = await supabase.from('keywords').select('*').eq('project_id', selectedProject).order('created_at', { ascending: false });
      setKeywords((data as Keyword[]) ?? []);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pesquisa de Keywords</h1>
        <p className="text-muted-foreground mt-1">Adicione e gerencie suas keywords</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="text-lg">Adicionar Keyword</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keyword</Label>
              <div className="flex gap-2">
                <Input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="ex: seo tools" onKeyDown={e => e.key === 'Enter' && addKeyword()} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={sourceType} onValueChange={v => setSourceType(v as SourceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['main','related','suggestion','idea','autocomplete','subtopic','paa'] as SourceType[]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addKeyword} className="gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
        </CardContent>
      </Card>

      {keywords.length > 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map(kw => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell><Badge variant="outline" className={sourceColors[kw.source_type]}>{kw.source_type}</Badge></TableCell>
                    <TableCell>{kw.search_volume ?? '—'}</TableCell>
                    <TableCell>{kw.keyword_difficulty != null ? `${kw.keyword_difficulty}%` : '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{kw.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma keyword ainda. Adicione a primeira!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

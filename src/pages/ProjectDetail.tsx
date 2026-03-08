import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Search, MapPin, Globe, Trash2, Rocket, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

type SourceType = 'main' | 'related' | 'suggestion' | 'idea' | 'autocomplete' | 'subtopic' | 'paa';

interface Project {
  id: string;
  name: string;
  target_location: string;
  target_language: string;
  created_at: string;
}

interface Keyword {
  id: string;
  keyword: string;
  source_type: SourceType;
  search_volume: number | null;
  search_intent: string | null;
  keyword_difficulty: number | null;
  competition_level: string | null;
  cpc: number | null;
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
  paa: 'bg-accent/20 text-accent-foreground',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('main');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const [projRes, kwRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('keywords').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ]);
      setProject(projRes.data as Project | null);
      setKeywords((kwRes.data as Keyword[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user, id]);

  const addKeyword = async () => {
    if (!newKeyword.trim() || !id) return;
    const { error } = await supabase.from('keywords').insert({
      project_id: id, keyword: newKeyword.trim(), source_type: sourceType,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Keyword adicionada!');
    setNewKeyword('');
    const { data } = await supabase.from('keywords').select('*').eq('project_id', id).order('created_at', { ascending: false });
    setKeywords((data as Keyword[]) ?? []);
  };

  const deleteKeyword = async (kwId: string) => {
    const { error } = await supabase.from('keywords').delete().eq('id', kwId);
    if (error) { toast.error(error.message); return; }
    setKeywords(prev => prev.filter(k => k.id !== kwId));
    toast.success('Keyword removida');
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!project) return <div className="text-muted-foreground">Projeto não encontrado.</div>;

  const analyzedCount = keywords.filter(k => k.status !== 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{project.target_location}</span>
            <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{project.target_language}</span>
            <span>Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/analysis`)}>
            <BarChart3 className="mr-2 h-4 w-4" />Análise & Clusters
          </Button>
          <Button onClick={() => navigate(`/projects/${project.id}/research`)} className="gradient-primary text-primary-foreground">
            <Rocket className="mr-2 h-4 w-4" />Pesquisar Keywords
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Keywords', value: keywords.length, color: 'text-primary' },
          { label: 'Analisadas', value: analyzedCount, color: 'text-chart-3' },
          { label: 'Pendentes', value: keywords.length - analyzedCount, color: 'text-chart-4' },
          { label: 'Conteúdos', value: 0, color: 'text-chart-2' },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border/50">
            <CardContent className="pt-4 pb-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="add">Adicionar</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Adicionar Keywords</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Keyword</Label>
                  <Input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    placeholder="ex: seo tools"
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                  />
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
              <Button onClick={addKeyword} className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />Adicionar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          {keywords.length > 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>KD</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords.map(kw => (
                      <TableRow key={kw.id} className="group cursor-pointer hover:bg-muted/20" onClick={() => kw.source_type === 'main' && kw.status === 'analyzed' ? navigate(`/projects/${id}/research/${kw.id}`) : undefined}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {kw.source_type === 'main' && kw.status === 'analyzed' && <Eye className="h-3.5 w-3.5 text-primary" />}
                            {kw.keyword}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={sourceColors[kw.source_type]}>{kw.source_type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{kw.search_volume?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{kw.keyword_difficulty != null ? `${kw.keyword_difficulty}%` : '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-sm">{kw.search_intent ?? '—'}</TableCell>
                        <TableCell><Badge variant="secondary">{kw.status}</Badge></TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => deleteKeyword(kw.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma keyword neste projeto. Adicione a primeira!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

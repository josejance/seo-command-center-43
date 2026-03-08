import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Search, ChevronDown, Loader2,
  CheckCircle2, XCircle, Circle, Rocket,
} from 'lucide-react';
import { toast } from 'sonner';

type StepStatus = 'idle' | 'loading' | 'success' | 'error';

interface ResearchStep {
  key: string;
  label: string;
  functionName: string;
  status: StepStatus;
  count: number;
  error?: string;
}

interface ParsedKeyword {
  keyword: string;
  search_volume?: number | null;
  search_intent?: string | null;
  keyword_difficulty?: number | null;
  competition_level?: string | null;
  cpc?: number | null;
  source_type: string;
}

interface SerpResult {
  position: number;
  domain?: string;
  url?: string;
  title?: string;
  description?: string;
  result_type: string;
  paa_answer?: string;
}

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  navigational: 'bg-primary/20 text-primary',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
};

export default function ProjectResearch() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [locationName, setLocationName] = useState('Brazil');
  const [languageName, setLanguageName] = useState('Portuguese');
  const [keyword, setKeyword] = useState('');
  const [isResearching, setIsResearching] = useState(false);

  // Checkboxes
  const [enableSerp, setEnableSerp] = useState(true);
  const [enableRelated, setEnableRelated] = useState(true);
  const [enableSuggestions, setEnableSuggestions] = useState(true);
  const [enableIdeas, setEnableIdeas] = useState(true);
  const [enableAutocomplete, setEnableAutocomplete] = useState(true);
  const [enableSubtopics, setEnableSubtopics] = useState(true);

  // Advanced settings
  const [serpDepth, setSerpDepth] = useState(10);
  const [keywordLimit, setKeywordLimit] = useState(50);
  const [paaDepth, setPaaDepth] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Results
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [allKeywords, setAllKeywords] = useState<ParsedKeyword[]>([]);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!user || !projectId) return;
    supabase.from('projects').select('name, target_location, target_language').eq('id', projectId).single()
      .then(({ data }) => {
        if (data) {
          setProjectName(data.name);
          setLocationName(data.target_location);
          setLanguageName(data.target_language);
        }
      });
  }, [user, projectId]);

  const updateStep = (key: string, update: Partial<ResearchStep>) => {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...update } : s));
  };

  const callEdgeFunction = async (
    functionName: string,
    body: Record<string, unknown>
  ): Promise<any> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    if (error) throw new Error(error.message || `Error calling ${functionName}`);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const saveResearchHistory = async (
    keywordId: string | null,
    endpoint: string,
    rawResponse: unknown,
    cost: number
  ) => {
    await supabase.from('research_history').insert({
      project_id: projectId!,
      keyword_id: keywordId,
      api_endpoint: endpoint,
      raw_response: rawResponse as any,
      cost_credits: cost,
    });
  };

  const handleResearch = async () => {
    if (!keyword.trim() || !projectId) return;
    setIsResearching(true);
    setShowResults(false);
    setAllKeywords([]);
    setSerpResults([]);

    // Create main keyword
    const { data: mainKw, error: mainKwErr } = await supabase
      .from('keywords')
      .insert({
        project_id: projectId,
        keyword: keyword.trim(),
        source_type: 'main' as const,
        status: 'pending' as const,
      })
      .select()
      .single();

    if (mainKwErr) {
      toast.error('Erro ao criar keyword principal: ' + mainKwErr.message);
      setIsResearching(false);
      return;
    }

    const mainKeywordId = mainKw.id;

    // Build steps
    const enabledSteps: ResearchStep[] = [];
    if (enableSerp) enabledSteps.push({ key: 'serp', label: 'Resultados SERP', functionName: 'research-serp', status: 'idle', count: 0 });
    if (enableRelated) enabledSteps.push({ key: 'related', label: 'Keywords Relacionadas', functionName: 'research-related', status: 'idle', count: 0 });
    if (enableSuggestions) enabledSteps.push({ key: 'suggestions', label: 'Sugestões', functionName: 'research-suggestions', status: 'idle', count: 0 });
    if (enableIdeas) enabledSteps.push({ key: 'ideas', label: 'Ideias', functionName: 'research-ideas', status: 'idle', count: 0 });
    if (enableAutocomplete) enabledSteps.push({ key: 'autocomplete', label: 'Autocomplete', functionName: 'research-autocomplete', status: 'idle', count: 0 });
    if (enableSubtopics) enabledSteps.push({ key: 'subtopics', label: 'Subtópicos', functionName: 'research-subtopics', status: 'idle', count: 0 });

    setSteps(enabledSteps);

    // Execute all in parallel
    const promises = enabledSteps.map(async (step) => {
      updateStep(step.key, { status: 'loading' });

      try {
        const body: Record<string, unknown> = {
          keyword: keyword.trim(),
          location_name: locationName,
          language_name: languageName,
        };

        if (step.key === 'serp') {
          body.depth = serpDepth;
          body.people_also_ask_click_depth = paaDepth;
        } else if (['related', 'suggestions', 'ideas'].includes(step.key)) {
          body.limit = keywordLimit;
        }

        const result = await callEdgeFunction(step.functionName, body);

        // Save history
        await saveResearchHistory(mainKeywordId, step.functionName, result.raw_response, result.cost || 0);

        if (step.key === 'serp') {
          // Save organic results to serp_results
          const organicItems = result.organic_results || [];
          const paaItems = result.paa_results || [];

          if (organicItems.length > 0) {
            await supabase.from('serp_results').insert(
              organicItems.map((r: SerpResult) => ({
                keyword_id: mainKeywordId,
                position: r.position,
                domain: r.domain,
                url: r.url,
                title: r.title,
                description: r.description,
                result_type: 'organic' as const,
              }))
            );
          }

          // Save PAA as keywords + serp_results
          for (const paa of paaItems) {
            const { data: paaKw } = await supabase.from('keywords').insert({
              project_id: projectId,
              keyword: paa.keyword_text || paa.title,
              source_type: 'paa' as const,
              parent_keyword_id: mainKeywordId,
            }).select().single();

            if (paaKw) {
              await supabase.from('serp_results').insert({
                keyword_id: paaKw.id,
                position: paa.position,
                domain: paa.domain,
                url: paa.url,
                title: paa.title,
                description: paa.description,
                paa_answer: paa.paa_answer,
                result_type: 'people_also_ask' as const,
              });
            }
          }

          setSerpResults(prev => [...prev, ...organicItems, ...paaItems]);
          updateStep(step.key, { status: 'success', count: organicItems.length + paaItems.length });
          return { key: step.key, keywords: [], serpCount: organicItems.length + paaItems.length };
        } else {
          // Save keywords
          const kws: ParsedKeyword[] = result.keywords || [];
          if (kws.length > 0) {
            await supabase.from('keywords').insert(
              kws.map((kw) => ({
                project_id: projectId,
                keyword: kw.keyword,
                source_type: kw.source_type as any,
                search_volume: kw.search_volume,
                search_intent: kw.search_intent,
                keyword_difficulty: kw.keyword_difficulty,
                competition_level: kw.competition_level,
                cpc: kw.cpc,
                parent_keyword_id: mainKeywordId,
                status: kw.search_volume ? 'analyzed' as const : 'pending' as const,
              }))
            );
          }

          updateStep(step.key, { status: 'success', count: kws.length });
          return { key: step.key, keywords: kws };
        }
      } catch (err: any) {
        updateStep(step.key, { status: 'error', error: err.message });
        return { key: step.key, keywords: [], error: err.message };
      }
    });

    const results = await Promise.allSettled(promises);

    // Collect all keywords
    const collected: ParsedKeyword[] = [];
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.keywords) {
        collected.push(...r.value.keywords);
      }
    });
    setAllKeywords(collected);

    // Update main keyword status
    await supabase.from('keywords').update({ status: 'analyzed' as const }).eq('id', mainKeywordId);

    setShowResults(true);
    setIsResearching(false);
    toast.success('Pesquisa concluída!');
  };

  const StatusIcon = ({ status }: { status: StepStatus }) => {
    switch (status) {
      case 'loading': return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-chart-3" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Pesquisa de Keywords</h1>
          <p className="text-muted-foreground mt-1">{projectName} · {locationName} · {languageName}</p>
        </div>
      </div>

      {/* Search Input */}
      <Card className="bg-card border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 opacity-5" style={{ background: 'linear-gradient(135deg, hsl(263 70% 50%), hsl(200 70% 50%))' }} />
        <CardContent className="pt-8 pb-8 relative">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  className="pl-12 h-14 text-lg bg-background/50 border-border/50"
                  placeholder="Digite sua palavra-chave principal..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isResearching && handleResearch()}
                  disabled={isResearching}
                />
              </div>
              <Button
                onClick={handleResearch}
                disabled={!keyword.trim() || isResearching}
                className="h-14 px-8 gradient-primary text-primary-foreground text-base"
              >
                {isResearching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Rocket className="mr-2 h-5 w-5" />}
                Pesquisar
              </Button>
            </div>

            {/* Analysis Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Resultados SERP', checked: enableSerp, set: setEnableSerp },
                { label: 'Keywords Relacionadas', checked: enableRelated, set: setEnableRelated },
                { label: 'Sugestões de Keywords', checked: enableSuggestions, set: setEnableSuggestions },
                { label: 'Ideias de Keywords', checked: enableIdeas, set: setEnableIdeas },
                { label: 'Autocomplete', checked: enableAutocomplete, set: setEnableAutocomplete },
                { label: 'Subtópicos', checked: enableSubtopics, set: setEnableSubtopics },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(v) => item.set(!!v)}
                    disabled={isResearching}
                  />
                  <label className="text-sm cursor-pointer">{item.label}</label>
                </div>
              ))}
            </div>

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                  Configurações avançadas
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm">Profundidade SERP: <span className="text-primary font-mono">{serpDepth}</span></Label>
                    <Slider
                      value={[serpDepth]}
                      onValueChange={([v]) => setSerpDepth(v)}
                      min={10} max={100} step={10}
                      disabled={isResearching}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm">Limite de keywords: <span className="text-primary font-mono">{keywordLimit}</span></Label>
                    <Slider
                      value={[keywordLimit]}
                      onValueChange={([v]) => setKeywordLimit(v)}
                      min={10} max={200} step={10}
                      disabled={isResearching}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm">PAA Click Depth: <span className="text-primary font-mono">{paaDepth}</span></Label>
                    <Slider
                      value={[paaDepth]}
                      onValueChange={([v]) => setPaaDepth(v)}
                      min={1} max={3} step={1}
                      disabled={isResearching}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Mission Control Progress */}
      {steps.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Mission Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {steps.map(step => (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    step.status === 'loading' ? 'border-primary/50 bg-primary/5' :
                    step.status === 'success' ? 'border-chart-3/30 bg-chart-3/5' :
                    step.status === 'error' ? 'border-destructive/30 bg-destructive/5' :
                    'border-border/50'
                  }`}
                >
                  <StatusIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{step.label}</p>
                    {step.status === 'success' && (
                      <p className="text-xs text-muted-foreground">{step.count} resultados</p>
                    )}
                    {step.status === 'error' && (
                      <p className="text-xs text-destructive truncate">{step.error}</p>
                    )}
                    {step.status === 'loading' && (
                      <p className="text-xs text-muted-foreground">Processando...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-6">
          {/* SERP Results */}
          {serpResults.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resultados SERP ({serpResults.filter(r => r.result_type === 'organic').length} orgânicos, {serpResults.filter(r => r.result_type === 'people_also_ask').length} PAA)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Domínio</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serpResults.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{r.position}</TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm font-medium truncate">{r.title || '—'}</p>
                            {r.url && <p className="text-xs text-muted-foreground truncate">{r.url}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{r.domain || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.result_type === 'organic' ? 'bg-chart-2/20 text-chart-2' : 'bg-chart-4/20 text-chart-4'}>
                            {r.result_type === 'people_also_ask' ? 'PAA' : r.result_type}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Keywords Results */}
          {allKeywords.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Keywords encontradas ({allKeywords.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>KD</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>Intent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allKeywords.slice(0, 100).map((kw, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {kw.source_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{kw.search_volume?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{kw.keyword_difficulty != null ? `${kw.keyword_difficulty}%` : '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}</TableCell>
                        <TableCell>
                          {kw.search_intent ? (
                            <Badge variant="outline" className={INTENT_BADGE[kw.search_intent.toLowerCase()] ?? 'bg-muted text-muted-foreground'}>
                              {kw.search_intent}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

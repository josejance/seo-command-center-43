import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ContentEditor from './ContentEditor';
import SeoChecklist from './SeoChecklist';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  search_intent: string | null;
  source_type: string;
  parent_keyword_id: string | null;
}

interface SerpResult {
  id: string;
  title: string | null;
  description: string | null;
  url: string | null;
  position: number;
  result_type: string;
  paa_answer: string | null;
  keyword_id: string;
}

interface OutlineSection {
  heading: string;
  level: string;
  talking_points: string[];
  target_keywords: string[];
  suggested_elements: string[];
}

interface Outline {
  title: string;
  meta_description: string;
  h1: string;
  sections: OutlineSection[];
  estimated_word_count: number;
  content_type: string;
}

interface Props {
  projectId: string;
  onDone: () => void;
  editingPieceId?: string | null;
}

const TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'conversational', label: 'Conversacional' },
  { value: 'academic', label: 'Acadêmico' },
  { value: 'journalistic', label: 'Jornalístico' },
  { value: 'storytelling', label: 'Storytelling' },
];

const INTENT_BADGE: Record<string, string> = {
  informational: 'bg-chart-2/20 text-chart-2',
  commercial: 'bg-chart-4/20 text-chart-4',
  transactional: 'bg-chart-3/20 text-chart-3',
  navigational: 'bg-primary/20 text-primary',
};

export default function ContentWizard({ projectId, onDone, editingPieceId }: Props) {
  const [step, setStep] = useState(1);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState('');
  const [secondaryIds, setSecondaryIds] = useState<Set<string>>(new Set());
  const [outline, setOutline] = useState<Outline | null>(null);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState('professional');
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [seoScore, setSeoScore] = useState(0);
  const [contentPieceId, setContentPieceId] = useState<string | null>(editingPieceId ?? null);

  useEffect(() => {
    const load = async () => {
      const { data: kwData } = await supabase
        .from('keywords').select('*').eq('project_id', projectId)
        .order('search_volume', { ascending: false, nullsFirst: false });
      setKeywords((kwData ?? []) as unknown as Keyword[]);

      // Load all SERP results for the project
      const kwIds = (kwData ?? []).map((k: any) => k.id);
      if (kwIds.length > 0) {
        const { data: serpData } = await supabase
          .from('serp_results').select('*').in('keyword_id', kwIds);
        setSerpResults((serpData ?? []) as unknown as SerpResult[]);
      }

      // If editing, load existing piece
      if (editingPieceId) {
        const { data: piece } = await supabase
          .from('content_pieces').select('*').eq('id', editingPieceId).single();
        if (piece) {
          setSelectedKeywordId(piece.keyword_id);
          if (piece.outline) setOutline(piece.outline as unknown as Outline);
          if (piece.draft) { setDraft(piece.draft); setStep(3); }
          else if (piece.outline) setStep(2);
        }
      }
    };
    load();
  }, [projectId, editingPieceId]);

  const selectedKeyword = keywords.find(k => k.id === selectedKeywordId);

  const mainKeywords = useMemo(() => keywords.filter(k => k.source_type === 'main'), [keywords]);

  const relatedKeywords = useMemo(() => {
    if (!selectedKeywordId) return [];
    return keywords.filter(k => k.parent_keyword_id === selectedKeywordId && k.source_type !== 'paa');
  }, [keywords, selectedKeywordId]);

  const paaQuestions = useMemo(() => {
    if (!selectedKeywordId) return [];
    const paaKws = keywords.filter(k => k.parent_keyword_id === selectedKeywordId && k.source_type === 'paa');
    const paaKwIds = paaKws.map(k => k.id);
    return serpResults.filter(r => paaKwIds.includes(r.keyword_id) && r.result_type === 'people_also_ask');
  }, [keywords, serpResults, selectedKeywordId]);

  const subtopics = useMemo(() => {
    if (!selectedKeywordId) return [];
    return keywords.filter(k => k.parent_keyword_id === selectedKeywordId && k.source_type === 'subtopic');
  }, [keywords, selectedKeywordId]);

  const topSerp = useMemo(() => {
    if (!selectedKeywordId) return [];
    return serpResults
      .filter(r => r.keyword_id === selectedKeywordId && r.result_type === 'organic')
      .sort((a, b) => a.position - b.position)
      .slice(0, 5);
  }, [serpResults, selectedKeywordId]);

  const toggleSecondary = (id: string) => {
    setSecondaryIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGenerateOutline = async () => {
    if (!selectedKeyword) return;
    setLoadingOutline(true);
    try {
      const secondaryKws = keywords.filter(k => secondaryIds.has(k.id)).map(k => k.keyword);
      const { data, error } = await supabase.functions.invoke('generate-outline', {
        body: {
          keyword: selectedKeyword.keyword,
          search_volume: selectedKeyword.search_volume,
          keyword_difficulty: selectedKeyword.keyword_difficulty,
          search_intent: selectedKeyword.search_intent,
          secondary_keywords: secondaryKws,
          paa_questions: paaQuestions.map(p => p.title).filter(Boolean),
          subtopics: subtopics.map(s => s.keyword),
          serp_results: topSerp.map(r => ({ title: r.title, description: r.description })),
        },
      });
      if (error) throw error;
      if (data?.outline) {
        setOutline(data.outline);
        // Save as content_piece
        if (!contentPieceId) {
          const { data: inserted, error: insertErr } = await supabase.from('content_pieces').insert({
            keyword_id: selectedKeywordId,
            title: data.outline.title || selectedKeyword.keyword,
            outline: data.outline,
            status: 'outline' as const,
          }).select('id').single();
          if (insertErr) throw insertErr;
          if (inserted) setContentPieceId(inserted.id);
        } else {
          await supabase.from('content_pieces').update({ outline: data.outline, title: data.outline.title }).eq('id', contentPieceId);
        }
        toast.success('Outline gerado com sucesso!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar outline');
    }
    setLoadingOutline(false);
  };

  const handleGenerateDraft = async () => {
    if (!outline) return;
    setLoadingDraft(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-draft', {
        body: {
          outline,
          keyword: selectedKeyword?.keyword,
          tone,
          word_count: outline.estimated_word_count || 1500,
        },
      });
      if (error) throw error;
      if (data?.draft) {
        setDraft(data.draft);
        if (contentPieceId) {
          await supabase.from('content_pieces').update({ draft: data.draft, status: 'draft' as const }).eq('id', contentPieceId);
        }
        toast.success('Rascunho gerado com sucesso!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar rascunho');
    }
    setLoadingDraft(false);
  };

  const handleSaveDraft = async (newContent: string) => {
    setDraft(newContent);
    if (contentPieceId) {
      await supabase.from('content_pieces').update({ draft: newContent }).eq('id', contentPieceId);
    }
  };

  const handleUpdateScore = async (score: number) => {
    setSeoScore(score);
    if (contentPieceId) {
      await supabase.from('content_pieces').update({ seo_score: score }).eq('id', contentPieceId);
    }
  };

  const handleFinalize = async () => {
    if (contentPieceId) {
      await supabase.from('content_pieces').update({ final_content: draft, status: 'final' as const, seo_score: seoScore }).eq('id', contentPieceId);
      toast.success('Conteúdo finalizado!');
    }
    onDone();
  };

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Keywords' },
          { n: 2, label: 'Outline' },
          { n: 3, label: 'Rascunho' },
          { n: 4, label: 'SEO' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <button
              onClick={() => { if (s.n <= step || (s.n === 2 && selectedKeywordId) || (s.n === 3 && outline) || (s.n === 4 && draft)) setStep(s.n); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${step === s.n ? 'bg-primary text-primary-foreground' : step > s.n ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
            >
              <span className="font-mono text-xs">{s.n}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Keywords */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-lg">Selecionar Keyword Principal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedKeywordId} onValueChange={setSelectedKeywordId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma keyword..." /></SelectTrigger>
                <SelectContent>
                  {mainKeywords.map(k => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.keyword} {k.search_volume ? `(${k.search_volume.toLocaleString()})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedKeyword && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="text-xl font-bold">{selectedKeyword.search_volume?.toLocaleString() ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Dificuldade</p>
                    <p className="text-xl font-bold">{selectedKeyword.keyword_difficulty ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Intent</p>
                    <Badge variant="outline" className={`${INTENT_BADGE[selectedKeyword.search_intent?.toLowerCase() ?? ''] ?? ''}`}>
                      {selectedKeyword.search_intent ?? '—'}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">CPC</p>
                    <p className="text-xl font-bold">{selectedKeyword.cpc != null ? `$${(selectedKeyword as any).cpc?.toFixed(2)}` : '—'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedKeywordId && relatedKeywords.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">Keywords Secundárias</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {relatedKeywords.slice(0, 20).map(k => (
                    <label key={k.id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-muted/30 px-2 rounded">
                      <Checkbox checked={secondaryIds.has(k.id)} onCheckedChange={() => toggleSecondary(k.id)} />
                      <span className="text-sm flex-1">{k.keyword}</span>
                      <span className="text-xs text-muted-foreground">{k.search_volume?.toLocaleString() ?? ''}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedKeywordId && paaQuestions.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">PAA Relacionadas ({paaQuestions.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {paaQuestions.slice(0, 8).map(p => (
                    <p key={p.id} className="text-sm text-muted-foreground">• {p.title}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {topSerp.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">Top 5 SERP — Inspiração</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topSerp.map(r => (
                    <div key={r.id} className="border-b border-border/30 pb-2 last:border-0">
                      <p className="text-sm font-medium">#{r.position} {r.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!selectedKeywordId}>
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Generate Outline */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gerar Outline</h3>
            <Button onClick={handleGenerateOutline} disabled={loadingOutline}>
              {loadingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {outline ? 'Regenerar Outline' : 'Gerar com IA'}
            </Button>
          </div>

          {outline ? (
            <Card className="bg-card border-border/50">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Título</p>
                  <p className="text-lg font-bold">{outline.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meta Description</p>
                  <p className="text-sm text-muted-foreground">{outline.meta_description}</p>
                  <p className="text-xs mt-1">{outline.meta_description?.length ?? 0} caracteres</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">H1</p>
                  <p className="text-base font-semibold">{outline.h1}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold">Seções ({outline.sections?.length ?? 0})</p>
                  {outline.sections?.map((s, i) => (
                    <div key={i} className={`border-l-2 ${s.level === 'h2' ? 'border-primary pl-4' : 'border-muted pl-8'} py-2`}>
                      <p className={`font-medium ${s.level === 'h2' ? 'text-base' : 'text-sm'}`}>{s.heading}</p>
                      {s.talking_points?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {s.talking_points.map((tp, j) => (
                            <li key={j} className="text-xs text-muted-foreground">• {tp}</li>
                          ))}
                        </ul>
                      )}
                      {s.target_keywords?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.target_keywords.map(kw => (
                            <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      )}
                      {s.suggested_elements?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.suggested_elements.map(el => (
                            <Badge key={el} variant="secondary" className="text-xs">{el}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>~{outline.estimated_word_count} palavras</span>
                  <span>Tipo: {outline.content_type}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Clique em "Gerar com IA" para criar o outline.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={!outline}>
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generate Draft */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold">Gerar Rascunho</h3>
            <div className="flex items-center gap-3">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateDraft} disabled={loadingDraft}>
                {loadingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {draft ? 'Regenerar' : 'Gerar Rascunho'}
              </Button>
            </div>
          </div>

          {draft ? (
            <ContentEditor
              content={draft}
              onChange={handleSaveDraft}
              keyword={selectedKeyword?.keyword ?? ''}
            />
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Selecione o tom e clique em "Gerar Rascunho".</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={() => setStep(4)} disabled={!draft}>
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: SEO Optimization */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Otimização SEO</h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ContentEditor
                content={draft}
                onChange={handleSaveDraft}
                keyword={selectedKeyword?.keyword ?? ''}
              />
            </div>
            <div>
              <SeoChecklist
                content={draft}
                outline={outline}
                keyword={selectedKeyword?.keyword ?? ''}
                secondaryKeywords={keywords.filter(k => secondaryIds.has(k.id)).map(k => k.keyword)}
                serpAvgLength={topSerp.length > 0 ? 1500 : undefined}
                onScoreChange={handleUpdateScore}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleFinalize} className="gradient-primary text-primary-foreground">
              Finalizar Conteúdo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

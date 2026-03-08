import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PaaResult {
  id: string;
  title: string | null;
  description: string | null;
  paa_answer: string | null;
  url: string | null;
  keyword_id: string;
}

interface Props {
  results: PaaResult[];
  projectId: string;
}

export default function TabPaa({ results, projectId }: Props) {
  const guessIntent = (text: string): string => {
    const lower = text.toLowerCase();
    if (/como|o que|por que|quando|qual|quem/i.test(lower)) return 'informational';
    if (/melhor|comparar|vs|review|avaliação/i.test(lower)) return 'commercial';
    if (/comprar|preço|onde|contratar/i.test(lower)) return 'transactional';
    return 'informational';
  };

  const INTENT_BADGE: Record<string, string> = {
    informational: 'bg-chart-2/20 text-chart-2',
    commercial: 'bg-chart-4/20 text-chart-4',
    transactional: 'bg-chart-3/20 text-chart-3',
    navigational: 'bg-primary/20 text-primary',
  };

  const handleUseForContent = async (paa: PaaResult) => {
    const { error } = await supabase.from('content_pieces').insert({
      keyword_id: paa.keyword_id,
      title: paa.title ?? 'Sem título',
      outline: { source: 'paa', question: paa.title, answer: paa.paa_answer },
      status: 'outline' as const,
    });
    if (error) toast.error(error.message);
    else toast.success('Adicionado como ideia de conteúdo!');
  };

  if (results.length === 0) {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma pergunta "People Also Ask" encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{results.length} perguntas encontradas</h3>
      <Accordion type="multiple" className="space-y-2">
        {results.map((paa, i) => {
          const intent = guessIntent(paa.title ?? '');
          return (
            <AccordionItem key={paa.id || i} value={paa.id || String(i)} className="border border-border/50 rounded-lg px-4 bg-card">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left flex-1">
                  <span className="font-mono text-xs text-muted-foreground w-6">{i + 1}.</span>
                  <span className="text-sm font-medium flex-1">{paa.title}</span>
                  <Badge variant="outline" className={`shrink-0 text-xs ${INTENT_BADGE[intent]}`}>{intent}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-3 pl-9">
                  {paa.paa_answer && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{paa.paa_answer}</p>
                  )}
                  {paa.url && (
                    <p className="text-xs text-muted-foreground break-all">Fonte: {paa.url}</p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleUseForContent(paa)}>
                    <Plus className="mr-1 h-3 w-3" />Usar para conteúdo
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

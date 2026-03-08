import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle } from 'lucide-react';

const GLOSSARY = [
  { term: 'MSV (Monthly Search Volume)', def: 'Número estimado de buscas mensais para uma keyword no Google.', why: 'Indica o potencial de tráfego orgânico.', ref: '0-100: baixo | 100-1.000: médio | 1.000+: alto' },
  { term: 'KD (Keyword Difficulty)', def: 'Escala de 0-100 que mede quão difícil é ranquear na primeira página para uma keyword.', why: 'Ajuda a priorizar keywords que seu site pode competir.', ref: '0-30: fácil | 31-60: médio | 61-80: difícil | 81+: muito difícil' },
  { term: 'CPC (Cost Per Click)', def: 'Valor médio pago por clique no Google Ads para essa keyword.', why: 'CPC alto indica alta intenção comercial — keywords que convertem.', ref: '<R$0.50: baixo | R$0.50-2: médio | >R$2: alto' },
  { term: 'SERP (Search Engine Results Page)', def: 'A página de resultados que o Google mostra quando alguém faz uma busca.', why: 'Analisar a SERP revela o tipo de conteúdo que o Google prefere.', ref: 'Top 3: maior parte dos cliques | Top 10: primeira página' },
  { term: 'PAA (People Also Ask)', def: 'Caixa de perguntas relacionadas que aparece nos resultados do Google.', why: 'Fonte valiosa de ideias de conteúdo e FAQs para seus artigos.', ref: 'Geralmente 4-8 perguntas por busca' },
  { term: 'Search Intent (Intenção de Busca)', def: 'O objetivo por trás da busca do usuário: aprender, comparar, comprar ou navegar.', why: 'Alinhar conteúdo com a intenção é crucial para ranquear.', ref: 'Informacional | Comercial | Transacional | Navegacional' },
  { term: 'Informacional', def: 'Usuário quer aprender algo. Ex: "como fazer SEO".', why: 'Ideal para blog posts, guias e tutoriais.', ref: 'Keywords com "como", "o que", "por que"' },
  { term: 'Comercial', def: 'Usuário está comparando opções. Ex: "melhor ferramenta SEO".', why: 'Ideal para comparativos e reviews.', ref: 'Keywords com "melhor", "vs", "review"' },
  { term: 'Transacional', def: 'Usuário quer comprar ou contratar. Ex: "comprar curso SEO".', why: 'Maior potencial de conversão.', ref: 'Keywords com "comprar", "preço", "contratar"' },
  { term: 'Navegacional', def: 'Usuário busca um site específico. Ex: "login semrush".', why: 'Difícil competir se não for a marca buscada.', ref: 'Geralmente inclui nome de marca' },
  { term: 'Backlink', def: 'Link de outro site apontando para o seu. Funciona como "voto de confiança".', why: 'Fator de ranqueamento importante. Mais backlinks de qualidade = mais autoridade.', ref: '0-10: poucos | 10-100: moderado | 100+: forte' },
  { term: 'Domain Authority (DA)', def: 'Métrica de 0-100 que estima a força de um domínio para ranquear no Google.', why: 'Sites com DA alto tendem a ranquear mais facilmente.', ref: '0-30: novo/fraco | 31-60: médio | 61+: forte' },
  { term: 'Content Gap', def: 'Tópicos que seus concorrentes cobrem mas você ainda não.', why: 'Identificar gaps revela oportunidades de conteúdo.', ref: 'Quanto menor o gap, mais completa sua cobertura' },
  { term: 'Cluster', def: 'Grupo de keywords semanticamente relacionadas em torno de um tema central.', why: 'Criar conteúdo em clusters melhora a topical authority.', ref: 'Ideal: 5-15 keywords por cluster' },
  { term: 'Long-tail', def: 'Keywords longas e específicas, geralmente 3+ palavras. Ex: "como fazer SEO para e-commerce em 2024".', why: 'Menos volume mas maior conversão e menor concorrência.', ref: 'Volume geralmente <500/mês' },
  { term: 'Head-tail', def: 'Keywords curtas e genéricas. Ex: "SEO".', why: 'Alto volume mas altíssima concorrência.', ref: 'Volume geralmente >10.000/mês' },
  { term: 'Featured Snippet', def: 'Resultado destacado no topo da SERP, acima do primeiro orgânico (posição 0).', why: 'Gera visibilidade máxima e CTR superior.', ref: 'Formato: parágrafo, lista ou tabela' },
];

export default function SeoGlossary() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Glossário SEO</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-4 pr-4">
          <div className="space-y-6">
            {GLOSSARY.map(item => (
              <div key={item.term} className="space-y-1.5">
                <h4 className="text-sm font-semibold text-foreground">{item.term}</h4>
                <p className="text-sm text-muted-foreground">{item.def}</p>
                <p className="text-xs text-primary">Por que importa: {item.why}</p>
                {item.ref && (
                  <Badge variant="outline" className="text-xs font-normal">{item.ref}</Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

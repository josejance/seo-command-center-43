import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  FolderKanban,
  Search,
  BarChart3,
  FileText,
  Activity,
  Settings,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HelpStep {
  title: string;
  description: string;
  tip?: string;
  result?: string;
  action?: string;
}

interface ModuleHelp {
  id: string;
  title: string;
  icon: React.ElementType;
  intro: string;
  steps: HelpStep[];
}

const modules: ModuleHelp[] = [
  {
    id: 'dashboard',
    title: 'Painel',
    icon: LayoutDashboard,
    intro: 'O Painel é sua central de comando. Aqui você vê um resumo de todos os seus projetos, palavras-chave e métricas de desempenho.',
    steps: [
      {
        title: 'Visualize seus projetos ativos',
        description: 'No topo do painel, você verá cards com o total de projetos, palavras-chave pesquisadas, posições monitoradas e pesquisas recentes.',
        result: 'Esses números mostram o progresso geral da sua estratégia SEO.',
        action: 'Se os números estiverem baixos, vá para "Projetos" e crie um novo projeto.',
      },
      {
        title: 'Analise os gráficos de tendência',
        description: 'Os gráficos mostram a evolução das suas pesquisas ao longo do tempo, distribuição de intenção de busca e atividade recente.',
        result: 'Use os gráficos para identificar padrões e sazonalidade nas suas palavras-chave.',
        action: 'Se não houver dados nos gráficos, faça mais pesquisas de palavras-chave.',
      },
      {
        title: 'Acesse projetos recentes rapidamente',
        description: 'Na parte inferior, você encontra atalhos para os projetos mais recentes com suas métricas resumidas.',
        result: 'Clique em qualquer projeto para acessar diretamente seus detalhes.',
        action: 'Use isso como ponto de partida para continuar o trabalho em andamento.',
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projetos',
    icon: FolderKanban,
    intro: 'Projetos organizam suas campanhas de SEO. Cada projeto representa um site ou nicho que você está otimizando.',
    steps: [
      {
        title: 'Crie um novo projeto',
        description: 'Clique em "Novo Projeto" e preencha o nome, país e idioma alvo. O país e idioma definem de qual região os dados de busca serão coletados.',
        result: 'Seu projeto será criado e aparecerá na lista. Ele servirá como container para todas as palavras-chave e análises.',
        action: 'Após criar o projeto, clique nele para acessar o painel de detalhes e começar a pesquisar palavras-chave.',
      },
      {
        title: 'Gerencie seus projetos',
        description: 'Na lista de projetos, você pode ver o total de palavras-chave de cada um, o país/idioma alvo e a data de criação.',
        result: 'Use essas informações para priorizar em qual projeto trabalhar.',
        action: 'Exclua projetos inativos para manter a organização. Use os filtros para encontrar projetos específicos.',
      },
      {
        title: 'Acesse as funcionalidades do projeto',
        description: 'Dentro de cada projeto, você encontra abas para Pesquisa, Análise, Conteúdo, Monitoramento e Automação.',
        result: 'Cada aba oferece ferramentas específicas vinculadas ao contexto do projeto.',
        action: 'Comece pela aba "Pesquisa" para adicionar palavras-chave ao projeto.',
      },
    ],
  },
  {
    id: 'research',
    title: 'Pesquisa de Palavras-chave',
    icon: Search,
    intro: 'A Pesquisa é onde você descobre e coleta palavras-chave relevantes para o seu nicho usando APIs de SEO.',
    steps: [
      {
        title: 'Selecione o projeto e adicione palavras-chave',
        description: 'Escolha um projeto no seletor e digite a palavra-chave semente no campo de busca. Você pode adicionar múltiplas palavras-chave separadas por vírgula.',
        result: 'As palavras-chave serão salvas no banco de dados vinculadas ao projeto selecionado.',
        action: 'Após adicionar, clique na palavra-chave para ver suas variações e dados detalhados.',
      },
      {
        title: 'Entenda os dados coletados',
        description: 'Para cada palavra-chave, você verá: Volume de Busca (quantas vezes é pesquisada por mês), Dificuldade (quão difícil é ranquear), e Tipo de Origem (principal, relacionada, sugestão, etc).',
        tip: 'Volume alto + dificuldade baixa = melhor oportunidade de ranqueamento.',
        result: 'Use esses dados para priorizar quais palavras-chave atacar no conteúdo.',
        action: 'Ordene por volume ou dificuldade para encontrar as melhores oportunidades.',
      },
      {
        title: 'Explore variações e sugestões',
        description: 'O sistema gera automaticamente palavras-chave relacionadas, sugestões de autocomplete, perguntas (PAA), subtópicos e ideias com IA.',
        result: 'Essas variações ampliam seu universo semântico e ajudam a cobrir mais intenções de busca.',
        action: 'Selecione as variações mais relevantes e use-as para criar clusters temáticos na aba de Análise.',
      },
    ],
  },
  {
    id: 'analysis',
    title: 'Análise SERP',
    icon: BarChart3,
    intro: 'A Análise mostra os resultados de busca (SERP) e métricas da concorrência para suas palavras-chave.',
    steps: [
      {
        title: 'Visualize os resultados de busca',
        description: 'Selecione uma palavra-chave com dados SERP coletados. Você verá os 10 primeiros resultados do Google com título, URL, domínio e posição.',
        result: 'Entenda quem está ranqueando para a palavra-chave e qual tipo de conteúdo funciona.',
        action: 'Analise os concorrentes para entender o padrão de conteúdo que o Google prefere.',
      },
      {
        title: 'Analise clusters e intenção de busca',
        description: 'O sistema agrupa palavras-chave semelhantes em clusters temáticos e classifica a intenção de busca (informacional, transacional, navegacional, comercial).',
        result: 'Clusters ajudam a organizar seu conteúdo em silos temáticos. A intenção indica que tipo de página criar.',
        action: 'Crie uma página para cada cluster, respeitando a intenção de busca predominante.',
      },
      {
        title: 'Identifique lacunas de conteúdo',
        description: 'A análise de Content Gap mostra tópicos que seus concorrentes cobrem mas você ainda não.',
        result: 'Essas lacunas são oportunidades diretas para criar conteúdo novo.',
        action: 'Priorize as lacunas com maior volume de busca e menor dificuldade.',
      },
    ],
  },
  {
    id: 'content',
    title: 'Estúdio de Conteúdo',
    icon: FileText,
    intro: 'O Estúdio de Conteúdo é onde você cria, otimiza e gerencia artigos otimizados para SEO com ajuda de IA.',
    steps: [
      {
        title: 'Gere um outline (estrutura)',
        description: 'Selecione uma palavra-chave e clique em "Gerar Outline". A IA criará uma estrutura de artigo com títulos H2/H3, baseada nos melhores resultados da SERP.',
        result: 'O outline é a base do seu artigo. Ele define a organização dos tópicos e subtópicos.',
        action: 'Revise e ajuste o outline antes de gerar o rascunho. Adicione ou remova seções conforme necessário.',
      },
      {
        title: 'Gere o rascunho com IA',
        description: 'A partir do outline aprovado, a IA escreve o conteúdo completo, incluindo introdução, desenvolvimento e conclusão otimizados para SEO.',
        result: 'O rascunho é um ponto de partida. Ele já inclui palavras-chave naturalmente e segue boas práticas de SEO.',
        action: 'Edite o rascunho no editor visual: ajuste o tom, adicione dados específicos e revise a precisão das informações.',
      },
      {
        title: 'Verifique o score SEO',
        description: 'O checklist de SEO analisa o conteúdo e atribui uma pontuação baseada em critérios como uso de palavras-chave, tamanho do texto, meta tags e links.',
        result: 'O score indica o quão otimizado está o conteúdo. Acima de 80 é considerado bom.',
        action: 'Siga as sugestões do checklist para melhorar o score antes de publicar.',
      },
      {
        title: 'Publique o conteúdo',
        description: 'Quando o conteúdo estiver pronto, altere o status para "Publicado". Se tiver integração WordPress configurada, pode publicar diretamente.',
        result: 'O conteúdo publicado será monitorado automaticamente para acompanhar seu desempenho.',
        action: 'Acompanhe o desempenho no módulo de Monitoramento após a publicação.',
      },
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoramento',
    icon: Activity,
    intro: 'O Monitoramento acompanha as posições das suas palavras-chave no Google e envia alertas sobre mudanças importantes.',
    steps: [
      {
        title: 'Ative o monitoramento de palavras-chave',
        description: 'Na página do projeto, marque as palavras-chave que deseja monitorar. O sistema verificará periodicamente as posições no Google.',
        result: 'Você terá um histórico de posições para cada palavra-chave monitorada.',
        action: 'Monitore pelo menos as 10-20 palavras-chave mais importantes do seu projeto.',
      },
      {
        title: 'Acompanhe o histórico de posições',
        description: 'O gráfico de histórico mostra como a posição de cada palavra-chave mudou ao longo do tempo.',
        result: 'Tendências de subida indicam que sua estratégia está funcionando. Quedas podem indicar problemas.',
        action: 'Se uma palavra-chave está caindo, revise o conteúdo da página correspondente e atualize-o.',
      },
      {
        title: 'Configure alertas',
        description: 'O sistema gera alertas automáticos quando há mudanças significativas: quedas de posição, melhorias notáveis ou novos concorrentes.',
        result: 'Alertas permitem agir rapidamente em situações críticas.',
        action: 'Priorize alertas de severidade alta e crítica. Investigue quedas de posição imediatamente.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configurações',
    icon: Settings,
    intro: 'Nas Configurações, você gerencia suas chaves de API, preferências de IA, integrações e aparência do sistema.',
    steps: [
      {
        title: 'Configure as chaves de API',
        description: 'Adicione sua chave da DataForSEO na aba "Chaves de API". Essa chave é necessária para coletar dados de busca, SERP e volume de palavras-chave.',
        result: 'Com a chave configurada, todas as funcionalidades de pesquisa estarão disponíveis.',
        action: 'Teste a conexão clicando no botão de teste após inserir a chave.',
      },
      {
        title: 'Escolha o modelo de IA',
        description: 'Na aba "IA", selecione qual modelo usar para geração de conteúdo, outlines e análises. Modelos mais potentes geram resultados melhores mas são mais lentos.',
        tip: 'Para tarefas simples, modelos rápidos são suficientes. Para conteúdo longo, use modelos premium.',
        result: 'O modelo escolhido será usado em todas as gerações automáticas do sistema.',
        action: 'Experimente diferentes modelos para encontrar o melhor equilíbrio entre qualidade e velocidade.',
      },
      {
        title: 'Configure integrações',
        description: 'Na aba "Integrações", conecte seu WordPress para publicação direta e configure webhooks para automações externas.',
        result: 'Integrações automatizam o fluxo de trabalho e eliminam etapas manuais.',
        action: 'Comece pela integração WordPress se você publica conteúdo regularmente.',
      },
    ],
  },
];

function getModuleForRoute(pathname: string): ModuleHelp {
  if (pathname.includes('/dashboard')) return modules.find(m => m.id === 'dashboard')!;
  if (pathname.includes('/project') && pathname.includes('/research')) return modules.find(m => m.id === 'research')!;
  if (pathname.includes('/project') && pathname.includes('/analysis')) return modules.find(m => m.id === 'analysis')!;
  if (pathname.includes('/project') && pathname.includes('/content')) return modules.find(m => m.id === 'content')!;
  if (pathname.includes('/project') && pathname.includes('/monitor')) return modules.find(m => m.id === 'monitoring')!;
  if (pathname.includes('/projects')) return modules.find(m => m.id === 'projects')!;
  if (pathname.includes('/research')) return modules.find(m => m.id === 'research')!;
  if (pathname.includes('/analysis')) return modules.find(m => m.id === 'analysis')!;
  if (pathname.includes('/content')) return modules.find(m => m.id === 'content')!;
  if (pathname.includes('/monitoring')) return modules.find(m => m.id === 'monitoring')!;
  if (pathname.includes('/settings')) return modules.find(m => m.id === 'settings')!;
  return modules.find(m => m.id === 'dashboard')!;
}

export function HelpGuide() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedModule, setSelectedModule] = useState<ModuleHelp | null>(null);
  const location = useLocation();

  const handleOpen = () => {
    const mod = getModuleForRoute(location.pathname);
    setSelectedModule(mod);
    setCurrentStep(0);
    setOpen(true);
  };

  const handleSelectModule = (mod: ModuleHelp) => {
    setSelectedModule(mod);
    setCurrentStep(0);
  };

  const step = selectedModule?.steps[currentStep];
  const totalSteps = selectedModule?.steps.length ?? 0;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-primary"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Ajuda</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Central de Ajuda
            </DialogTitle>
            <DialogDescription className="text-xs">
              Guia passo a passo para cada módulo do SEO Command Center
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar with modules */}
            <div className="w-44 shrink-0 border-r border-border overflow-y-auto p-2 space-y-0.5">
              {modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => handleSelectModule(mod)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left',
                      selectedModule?.id === mod.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{mod.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {selectedModule && (
                <div className="p-4 space-y-4">
                  {/* Module intro */}
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <selectedModule.icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{selectedModule.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedModule.intro}</p>
                  </div>

                  {/* Step indicator */}
                  <div className="flex items-center gap-1.5">
                    {selectedModule.steps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        )}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Passo {currentStep + 1} de {totalSteps}
                    </span>
                  </div>

                  {/* Current step */}
                  {step && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            {currentStep + 1}
                          </Badge>
                          {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {step.tip && (
                        <div className="flex gap-2 bg-chart-4/10 border border-chart-4/20 rounded-md p-2.5">
                          <Lightbulb className="h-3.5 w-3.5 text-chart-4 shrink-0 mt-0.5" />
                          <p className="text-xs text-chart-4 leading-relaxed">{step.tip}</p>
                        </div>
                      )}

                      {step.result && (
                        <div className="flex gap-2 bg-primary/5 border border-primary/15 rounded-md p-2.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">O que os resultados significam</span>
                            <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{step.result}</p>
                          </div>
                        </div>
                      )}

                      {step.action && (
                        <div className="flex gap-2 bg-chart-2/10 border border-chart-2/20 rounded-md p-2.5">
                          <ArrowRight className="h-3.5 w-3.5 text-chart-2 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-semibold text-chart-2 uppercase tracking-wider">O que fazer a seguir</span>
                            <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{step.action}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                      className="text-xs h-7 gap-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Anterior
                    </Button>
                    <Button
                      variant={currentStep === totalSteps - 1 ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        if (currentStep === totalSteps - 1) {
                          setOpen(false);
                        } else {
                          setCurrentStep(currentStep + 1);
                        }
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      {currentStep === totalSteps - 1 ? 'Entendi!' : 'Próximo'}
                      {currentStep < totalSteps - 1 && <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

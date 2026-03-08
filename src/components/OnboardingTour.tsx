import { useEffect, useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const steps: Step[] = [
  {
    target: '[data-tour="projects"]',
    content: 'Comece criando um projeto para organizar suas keywords e pesquisas de SEO.',
    title: '1. Criar Projeto',
    disableBeacon: true,
  },
  {
    target: '[data-tour="research"]',
    content: 'Pesquise keywords usando APIs de SEO para encontrar oportunidades de conteúdo.',
    title: '2. Pesquisar Keywords',
  },
  {
    target: '[data-tour="analysis"]',
    content: 'Analise os resultados com clusters, mapas de intenção e lacunas de conteúdo.',
    title: '3. Analisar Resultados',
  },
  {
    target: '[data-tour="content"]',
    content: 'Gere outlines e drafts otimizados para SEO com inteligência artificial.',
    title: '4. Gerar Conteúdo',
  },
  {
    target: '[data-tour="monitoring"]',
    content: 'Monitore suas posições no Google e receba alertas de mudanças de ranking.',
    title: '5. Monitorar Rankings',
  },
];

export function OnboardingTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('user_id', user.id)
        .eq('setting_key', 'onboarding_completed')
        .maybeSingle();
      if (!data) setRun(true);
    };
    check();
  }, [user]);

  const handleCallback = async (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (user) {
        await supabase.from('app_settings').upsert({
          user_id: user.id,
          setting_key: 'onboarding_completed',
          setting_value: 'true',
        }, { onConflict: 'user_id,setting_key' });
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
      styles={{
        options: {
          primaryColor: 'hsl(263 70% 50.4%)',
          zIndex: 10000,
          backgroundColor: 'hsl(240 6% 10%)',
          textColor: 'hsl(0 0% 95%)',
          arrowColor: 'hsl(240 6% 10%)',
        },
        tooltipTitle: { color: 'hsl(0 0% 95%)' },
        tooltipContent: { color: 'hsl(240 5% 75%)' },
        buttonNext: {
          backgroundColor: 'hsl(263 70% 50.4%)',
          color: '#fff',
          borderRadius: '8px',
        },
        buttonBack: { color: 'hsl(240 5% 60%)' },
        buttonSkip: { color: 'hsl(240 5% 60%)' },
      }}
    />
  );
}

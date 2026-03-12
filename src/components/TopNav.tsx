import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Search,
  BarChart3,
  FileText,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpGuide } from '@/components/HelpGuide';

const navItems = [
  { title: 'Painel', url: '/dashboard', icon: LayoutDashboard, desc: 'Visão geral de métricas e desempenho' },
  { title: 'Projetos', url: '/projects', icon: FolderKanban, desc: 'Gerencie seus sites e campanhas SEO' },
  { title: 'Pesquisa', url: '/research', icon: Search, desc: 'Descubra palavras-chave e oportunidades' },
  { title: 'Análise', url: '/analysis', icon: BarChart3, desc: 'Analise resultados de busca e concorrência' },
  { title: 'Conteúdo', url: '/content', icon: FileText, desc: 'Crie e otimize artigos para SEO' },
  { title: 'Monitoramento', url: '/monitoring', icon: Activity, desc: 'Acompanhe posições e alertas em tempo real' },
  { title: 'Configurações', url: '/settings', icon: Settings, desc: 'Ajuste preferências e integrações' },
];


export function TopNav() {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="h-11 flex-row flex items-center justify-center gap-[10px] mx-[4px] my-[20px] py-[10px] mt-[47px] px-[19px]">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2">
          <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
            <Search className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-bold text-xs text-foreground hidden lg:block">SEO Command</span>
        </div>

        {/* Desktop nav */}
        {!isMobile &&
        <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {navItems.map((item) =>
          <Tooltip key={item.url}>
                <TooltipTrigger asChild>
                  <NavLink
                to={item.url}
                className={({ isActive }) =>
                cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap',
                  isActive ?
                  'bg-primary/10 text-primary font-medium' :
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )
                }>
                
                    <item.icon className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">{item.title}</span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </TooltipContent>
              </Tooltip>
          )}
          </nav>
        }

        {/* Spacer for mobile */}
        {isMobile && <div className="flex-1" />}

        {/* Right side */}
        <div className="flex items-center gap-1 shrink-0">
          <HelpGuide />
          {!isMobile &&
          <>
              <span className="text-xs text-muted-foreground hidden xl:block max-w-[140px] truncate">{user?.email}</span>
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-medium">
                {initials}
              </div>
              <button
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted/50 transition-colors"
              aria-label="Sair">
              
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          }
          {isMobile &&
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-muted-foreground"
            aria-label="Menu">
            
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          }
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobile && mobileOpen &&
      <nav className="border-t border-border bg-card px-3 py-1.5 space-y-0.5">
          {navItems.map((item) =>
        <NavLink
          key={item.url}
          to={item.url}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
          cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors',
            isActive ?
            'bg-primary/10 text-primary font-medium' :
            'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )
          }>
              <item.icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span>{item.title}</span>
                <span className="text-[10px] text-muted-foreground font-normal">{item.desc}</span>
              </div>
            </NavLink>
        )}
          <button
          onClick={signOut}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-destructive w-full">
          
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </nav>
      }
    </header>);

}
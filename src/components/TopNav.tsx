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

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Projetos', url: '/projects', icon: FolderKanban },
  { title: 'Pesquisa', url: '/research', icon: Search },
  { title: 'Análise', url: '/analysis', icon: BarChart3 },
  { title: 'Conteúdo', url: '/content', icon: FileText },
  { title: 'Monitoramento', url: '/monitoring', icon: Activity },
  { title: 'Configurações', url: '/settings', icon: Settings },
];

export function TopNav() {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">SEO Command</span>
        </div>

        {/* Desktop nav */}
        {!isMobile && (
          <nav className="flex items-center gap-1 mx-4 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {!isMobile && (
            <>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                {initials}
              </div>
              <button
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 text-muted-foreground"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMobile && mobileOpen && (
        <nav className="border-t border-border bg-card px-4 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </nav>
      )}
    </header>
  );
}

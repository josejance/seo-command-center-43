import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { to: '/projects', icon: FolderKanban, label: 'Projetos' },
  { to: '/research', icon: Search, label: 'Pesquisa' },
  { to: '/settings', icon: Settings, label: 'Config' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 text-xs transition-colors px-3 py-1.5',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

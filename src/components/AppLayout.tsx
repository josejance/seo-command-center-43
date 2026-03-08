import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertsBell } from '@/components/AlertsBell';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BottomNav } from '@/components/BottomNav';
import { CommandPalette } from '@/components/CommandPalette';
import { OnboardingTour } from '@/components/OnboardingTour';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              {!isMobile && <SidebarTrigger className="text-muted-foreground" />}
              {isMobile && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <Search className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-sm">SEO Command</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex text-muted-foreground text-xs gap-2"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                aria-label="Busca global (Ctrl+K)"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar...</span>
                <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
              </Button>
              <AlertsBell />
              <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
      {isMobile && <BottomNav />}
      <CommandPalette />
      <OnboardingTour />
    </SidebarProvider>
  );
}

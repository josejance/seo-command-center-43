import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  read: boolean;
  created_at: string;
  project_id: string;
}

export function AlertsBell() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get user's projects first
      const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id);
      if (!projects || projects.length === 0) return;

      const projectIds = projects.map(p => p.id);
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(30);
      setAlerts((data as Alert[]) ?? []);
    };
    load();
  }, [user]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const markRead = async (alertId: string) => {
    await supabase.from('alerts').update({ read: true }).eq('id', alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
  };

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.read);
    for (const a of unread) {
      await supabase.from('alerts').update({ read: true }).eq('id', a.id);
    }
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Alertas</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-muted-foreground">
                Marcar todos como lidos
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-8rem)]">
          <div className="space-y-2 pr-2">
            {alerts.length > 0 ? alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border border-border/50 cursor-pointer transition-opacity ${alert.read ? 'opacity-50' : 'bg-muted/20'}`}
                onClick={() => !alert.read && markRead(alert.id)}
              >
                <div className="flex items-start gap-2">
                  {alert.type === 'rank_drop' ? (
                    <TrendingDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  ) : alert.type === 'rank_improvement' ? (
                    <TrendingUp className="h-4 w-4 text-chart-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-chart-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">{alert.severity}</Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

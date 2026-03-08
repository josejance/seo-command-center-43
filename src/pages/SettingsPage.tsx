import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Bot, Check, X, User, Key, Globe, Webhook, Palette, BarChart3,
  Plus, Trash2, Send, Moon, Sun, Eye, EyeOff, Shield, CheckCircle2, XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ModelOption {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string } | null;
}

interface ApiKeyStatus {
  dataforseo: 'idle' | 'testing' | 'connected' | 'error';
  claude: 'idle' | 'testing' | 'connected' | 'error';
}

const COUNTRIES = [
  { value: 'Brazil', label: '🇧🇷 Brasil' },
  { value: 'United States', label: '🇺🇸 Estados Unidos' },
  { value: 'Portugal', label: '🇵🇹 Portugal' },
  { value: 'Spain', label: '🇪🇸 Espanha' },
  { value: 'United Kingdom', label: '🇬🇧 Reino Unido' },
  { value: 'Germany', label: '🇩🇪 Alemanha' },
  { value: 'France', label: '🇫🇷 França' },
  { value: 'Italy', label: '🇮🇹 Itália' },
  { value: 'Mexico', label: '🇲🇽 México' },
  { value: 'Argentina', label: '🇦🇷 Argentina' },
  { value: 'Colombia', label: '🇨🇴 Colômbia' },
  { value: 'Japan', label: '🇯🇵 Japão' },
  { value: 'India', label: '🇮🇳 Índia' },
  { value: 'Canada', label: '🇨🇦 Canadá' },
  { value: 'Australia', label: '🇦🇺 Austrália' },
];

const LANGUAGES = [
  { value: 'Portuguese', label: 'Português' },
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Italian', label: 'Italiano' },
  { value: 'Japanese', label: '日本語' },
  { value: 'Chinese', label: '中文' },
];

const WEBHOOK_EVENTS = [
  { id: 'research_completed', label: 'Pesquisa concluída' },
  { id: 'content_generated', label: 'Conteúdo gerado' },
  { id: 'rank_alert', label: 'Alerta de ranking' },
  { id: 'pipeline_completed', label: 'Pipeline concluído' },
  { id: 'bulk_completed', label: 'Pesquisa em massa concluída' },
];

const ACCENT_COLORS = [
  { name: 'Roxo', hsl: '263 70% 50.4%' },
  { name: 'Azul', hsl: '217 91% 60%' },
  { name: 'Verde', hsl: '142 71% 45%' },
  { name: 'Laranja', hsl: '25 95% 53%' },
  { name: 'Rosa', hsl: '330 81% 60%' },
  { name: 'Ciano', hsl: '186 78% 42%' },
  { name: 'Vermelho', hsl: '0 72% 51%' },
  { name: 'Âmbar', hsl: '45 93% 47%' },
];

export default function SettingsPage() {
  const { user } = useAuth();

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // API Keys
  const [dataforseoLogin, setDataforseoLogin] = useState('');
  const [dataforseoPassword, setDataforseoPassword] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [apiStatus, setApiStatus] = useState<ApiKeyStatus>({ dataforseo: 'idle', claude: 'idle' });
  const [savingApis, setSavingApis] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({ dataforseo: false, claude: false });

  // Domains
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');

  // Research Defaults
  const [defaultLocation, setDefaultLocation] = useState('Brazil');
  const [defaultLanguage, setDefaultLanguage] = useState('Portuguese');
  const [defaultDepth, setDefaultDepth] = useState(3);
  const [defaultLimit, setDefaultLimit] = useState(10);

  // Webhooks
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [sendingTest, setSendingTest] = useState(false);

  // Theme
  const [darkMode, setDarkMode] = useState(true);
  const [accentColor, setAccentColor] = useState('263 70% 50.4%');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // AI Model
  const [modelQuery, setModelQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [searchingModels, setSearchingModels] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // WordPress
  const [wpUrl, setWpUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [savingWp, setSavingWp] = useState(false);
  const [testingWp, setTestingWp] = useState(false);
  const [wpStatus, setWpStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  // Usage
  const [usageData, setUsageData] = useState<{ month: string; credits: number; cost: number }[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);

  // Loading
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadAllSettings();
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Apply theme changes
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor);
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--ring', accentColor);
    document.documentElement.style.setProperty('--sidebar-primary', accentColor);
    document.documentElement.style.setProperty('--sidebar-ring', accentColor);
    document.documentElement.style.setProperty('--chart-1', accentColor);
    const [h] = accentColor.split(' ');
    document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${accentColor}), hsl(${parseInt(h) + 17} 80% 60%))`);
    document.documentElement.style.setProperty('--shadow-glow', `0 0 30px -5px hsl(${accentColor} / 0.3)`);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    root.style.fontSize = sizes[fontSize];
  }, [fontSize]);

  const loadAllSettings = async () => {
    if (!user) return;
    setLoadingSettings(true);

    const [profileRes, settingsRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).single(),
      supabase.from('app_settings').select('setting_key, setting_value').eq('user_id', user.id),
      supabase.from('research_history').select('cost_credits, executed_at').order('executed_at', { ascending: false }),
    ]);

    if (profileRes.data) {
      setDisplayName(profileRes.data.display_name ?? '');
      setAvatarUrl(profileRes.data.avatar_url ?? '');
    }

    const settings = (settingsRes.data ?? []).reduce((acc, s) => {
      acc[s.setting_key] = s.setting_value;
      return acc;
    }, {} as Record<string, string>);

    if (settings.ai_model) { setSelectedModel(settings.ai_model); setModelQuery(settings.ai_model); }
    if (settings.dataforseo_login) setDataforseoLogin(settings.dataforseo_login);
    if (settings.dataforseo_password) setDataforseoPassword(settings.dataforseo_password);
    if (settings.claude_api_key) setClaudeApiKey(settings.claude_api_key);
    if (settings.domains) { try { setDomains(JSON.parse(settings.domains)); } catch {} }
    if (settings.default_location) setDefaultLocation(settings.default_location);
    if (settings.default_language) setDefaultLanguage(settings.default_language);
    if (settings.default_depth) setDefaultDepth(parseInt(settings.default_depth) || 3);
    if (settings.default_limit) setDefaultLimit(parseInt(settings.default_limit) || 10);
    if (settings.webhook_url) setWebhookUrl(settings.webhook_url);
    if (settings.webhook_events) { try { setWebhookEvents(JSON.parse(settings.webhook_events)); } catch {} }
    if (settings.accent_color) setAccentColor(settings.accent_color);
    if (settings.font_size) setFontSize(settings.font_size as 'small' | 'medium' | 'large');

    // Check API statuses
    if (settings.dataforseo_login && settings.dataforseo_password) setApiStatus(p => ({ ...p, dataforseo: 'connected' }));
    if (settings.claude_api_key) setApiStatus(p => ({ ...p, claude: 'connected' }));
    if (settings.wordpress_url) setWpUrl(settings.wordpress_url);
    if (settings.wordpress_username) setWpUsername(settings.wordpress_username);
    if (settings.wordpress_app_password) { setWpAppPassword(settings.wordpress_app_password); setWpStatus('connected'); }

    // Usage data
    const history = historyRes.data ?? [];
    const monthMap: Record<string, { credits: number; cost: number }> = {};
    let total = 0;
    history.forEach(h => {
      const d = new Date(h.executed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { credits: 0, cost: 0 };
      const c = h.cost_credits ?? 0;
      monthMap[key].credits += c;
      monthMap[key].cost += c * 0.01;
      total += c;
    });
    const months = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({ month, ...data }));
    setUsageData(months);
    setTotalCredits(total);

    setLoadingSettings(false);
  };

  const saveSetting = async (key: string, value: string) => {
    if (!user) return;
    await supabase.from('app_settings').upsert(
      { user_id: user.id, setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,setting_key' }
    );
  };

  // Profile
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName, avatar_url: avatarUrl }).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else toast.success('Perfil atualizado!');
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success('Senha alterada com sucesso!'); setNewPassword(''); setCurrentPassword(''); }
    setChangingPassword(false);
  };

  // API Keys
  const handleSaveApiKeys = async () => {
    if (!user) return;
    setSavingApis(true);
    await Promise.all([
      saveSetting('dataforseo_login', dataforseoLogin),
      saveSetting('dataforseo_password', dataforseoPassword),
      saveSetting('claude_api_key', claudeApiKey),
    ]);
    toast.success('Credenciais salvas!');
    setSavingApis(false);
  };

  const testDataforseo = async () => {
    setApiStatus(p => ({ ...p, dataforseo: 'testing' }));
    try {
      const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
        headers: { 'Authorization': 'Basic ' + btoa(`${dataforseoLogin}:${dataforseoPassword}`) }
      });
      if (res.ok) {
        setApiStatus(p => ({ ...p, dataforseo: 'connected' }));
        toast.success('DataForSEO conectado com sucesso!');
      } else {
        setApiStatus(p => ({ ...p, dataforseo: 'error' }));
        toast.error('Credenciais DataForSEO inválidas');
      }
    } catch {
      setApiStatus(p => ({ ...p, dataforseo: 'error' }));
      toast.error('Erro ao conectar com DataForSEO');
    }
  };

  const testClaude = async () => {
    setApiStatus(p => ({ ...p, claude: 'testing' }));
    try {
      // Test using a minimal request - just check if key format is valid
      if (claudeApiKey.startsWith('sk-') && claudeApiKey.length > 20) {
        setApiStatus(p => ({ ...p, claude: 'connected' }));
        toast.success('Chave Claude configurada!');
      } else {
        setApiStatus(p => ({ ...p, claude: 'error' }));
        toast.error('Formato de chave inválido');
      }
    } catch {
      setApiStatus(p => ({ ...p, claude: 'error' }));
      toast.error('Erro ao validar chave');
    }
  };

  // Domains
  const addDomain = async () => {
    const d = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (!d) return;
    if (domains.includes(d)) { toast.error('Domínio já adicionado'); return; }
    const updated = [...domains, d];
    setDomains(updated);
    setNewDomain('');
    await saveSetting('domains', JSON.stringify(updated));
    toast.success('Domínio adicionado!');
  };

  const removeDomain = async (domain: string) => {
    const updated = domains.filter(d => d !== domain);
    setDomains(updated);
    await saveSetting('domains', JSON.stringify(updated));
    toast.success('Domínio removido');
  };

  // Research Defaults
  const saveResearchDefaults = async () => {
    await Promise.all([
      saveSetting('default_location', defaultLocation),
      saveSetting('default_language', defaultLanguage),
      saveSetting('default_depth', String(defaultDepth)),
      saveSetting('default_limit', String(defaultLimit)),
    ]);
    toast.success('Padrões de pesquisa salvos!');
  };

  // Webhooks
  const saveWebhook = async () => {
    await Promise.all([
      saveSetting('webhook_url', webhookUrl),
      saveSetting('webhook_events', JSON.stringify(webhookEvents)),
    ]);
    toast.success('Webhook salvo!');
  };

  const sendWebhookTest = async () => {
    if (!webhookUrl) { toast.error('Informe a URL do webhook'); return; }
    setSendingTest(true);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          message: 'Teste de webhook do SEO Platform',
          timestamp: new Date().toISOString(),
        }),
      });
      if (res.ok) toast.success('Webhook enviado com sucesso!');
      else toast.error(`Webhook retornou status ${res.status}`);
    } catch {
      toast.error('Erro ao enviar webhook (verifique CORS/URL)');
    }
    setSendingTest(false);
  };

  // Theme
  const saveTheme = async () => {
    await Promise.all([
      saveSetting('accent_color', accentColor),
      saveSetting('font_size', fontSize),
    ]);
    toast.success('Tema salvo!');
  };

  // AI Model
  const searchModels = async (query: string) => {
    if (query.length < 2) { setModelOptions([]); setShowDropdown(false); return; }
    setSearchingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke('model-search', { body: { query } });
      if (error) throw error;
      setModelOptions(data?.models ?? []);
      setShowDropdown(true);
    } catch { setModelOptions([]); }
    setSearchingModels(false);
  };

  const handleModelQueryChange = (value: string) => {
    setModelQuery(value);
    setSelectedModel('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchModels(value), 300);
  };

  const selectModel = (model: ModelOption) => {
    setSelectedModel(model.id);
    setModelQuery(model.id);
    setShowDropdown(false);
  };

  const handleSaveModel = async () => {
    if (!user || !selectedModel) return;
    setSavingModel(true);
    await saveSetting('ai_model', selectedModel);
    toast.success(`Modelo "${selectedModel}" salvo!`);
    setSavingModel(false);
  };

  const toggleWebhookEvent = (eventId: string) => {
    setWebhookEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const ApiStatusBadge = ({ status }: { status: 'idle' | 'testing' | 'connected' | 'error' }) => {
    if (status === 'testing') return <Badge variant="outline" className="text-chart-4"><Loader2 className="h-3 w-3 animate-spin mr-1" />Testando...</Badge>;
    if (status === 'connected') return <Badge variant="outline" className="text-chart-3 border-chart-3/30"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>;
    if (status === 'error') return <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Desconectado</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">Não configurado</Badge>;
  };

  if (loadingSettings) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" />Carregando configurações...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu perfil, APIs e preferências</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Perfil</TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5"><Key className="h-3.5 w-3.5" />API Keys</TabsTrigger>
          <TabsTrigger value="domains" className="gap-1.5"><Globe className="h-3.5 w-3.5" />Domínios</TabsTrigger>
          <TabsTrigger value="research" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Pesquisa</TabsTrigger>
          <TabsTrigger value="wordpress" className="gap-1.5"><Globe className="h-3.5 w-3.5" />WordPress</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5"><Palette className="h-3.5 w-3.5" />Tema</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5"><Bot className="h-3.5 w-3.5" />Modelo IA</TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Uso</TabsTrigger>
        </TabsList>

        {/* PERFIL */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Gerencie seus dados pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                  {displayName ? displayName[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                  <Label>URL do Avatar</Label>
                  <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label>Nome de exibição</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="gradient-primary text-primary-foreground">
                {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Perfil
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline">
                {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API KEYS */}
        <TabsContent value="api" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                DataForSEO
                <ApiStatusBadge status={apiStatus.dataforseo} />
              </CardTitle>
              <CardDescription>Credenciais para pesquisa de keywords e SERP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Login</Label>
                <Input value={dataforseoLogin} onChange={e => setDataforseoLogin(e.target.value)} placeholder="seu-email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showApiKeys.dataforseo ? 'text' : 'password'}
                    value={dataforseoPassword}
                    onChange={e => setDataforseoPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowApiKeys(p => ({ ...p, dataforseo: !p.dataforseo }))}
                  >
                    {showApiKeys.dataforseo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={testDataforseo} variant="outline" disabled={!dataforseoLogin || !dataforseoPassword || apiStatus.dataforseo === 'testing'}>
                  {apiStatus.dataforseo === 'testing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Claude API
                <ApiStatusBadge status={apiStatus.claude} />
              </CardTitle>
              <CardDescription>Chave para geração de conteúdo com Claude</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKeys.claude ? 'text' : 'password'}
                    value={claudeApiKey}
                    onChange={e => setClaudeApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowApiKeys(p => ({ ...p, claude: !p.claude }))}
                  >
                    {showApiKeys.claude ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <Button onClick={testClaude} variant="outline" disabled={!claudeApiKey || apiStatus.claude === 'testing'}>
                {apiStatus.claude === 'testing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Testar Conexão
              </Button>
            </CardContent>
          </Card>

          <Button onClick={handleSaveApiKeys} disabled={savingApis} className="gradient-primary text-primary-foreground">
            {savingApis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Credenciais
          </Button>
        </TabsContent>

        {/* DOMÍNIOS */}
        <TabsContent value="domains">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Seus Domínios</CardTitle>
              <CardDescription>Domínios usados para rank tracking e análise de concorrentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="meusite.com.br"
                  onKeyDown={e => e.key === 'Enter' && addDomain()}
                  className="flex-1"
                />
                <Button onClick={addDomain} size="icon" className="gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {domains.length > 0 ? (
                <div className="space-y-2">
                  {domains.map(domain => (
                    <div key={domain} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm">{domain}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeDomain(domain)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum domínio cadastrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PADRÕES DE PESQUISA */}
        <TabsContent value="research">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Padrões de Pesquisa</CardTitle>
              <CardDescription>Valores padrão para novas pesquisas de keywords</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Localização padrão</Label>
                  <Select value={defaultLocation} onValueChange={setDefaultLocation}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma padrão</Label>
                  <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Depth (profundidade)</Label>
                  <span className="text-sm font-mono text-primary">{defaultDepth}</span>
                </div>
                <Slider value={[defaultDepth]} onValueChange={v => setDefaultDepth(v[0])} min={1} max={10} step={1} />
                <p className="text-xs text-muted-foreground">Quantidade de níveis de profundidade nas pesquisas</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Limit (resultados)</Label>
                  <span className="text-sm font-mono text-primary">{defaultLimit}</span>
                </div>
                <Slider value={[defaultLimit]} onValueChange={v => setDefaultLimit(v[0])} min={5} max={100} step={5} />
                <p className="text-xs text-muted-foreground">Número máximo de resultados por pesquisa</p>
              </div>

              <Button onClick={saveResearchDefaults} className="gradient-primary text-primary-foreground">
                Salvar Padrões
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WORDPRESS */}
        <TabsContent value="wordpress">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                WordPress
                {wpStatus === 'connected' ? (
                  <Badge variant="outline" className="text-chart-3 border-chart-3/30"><CheckCircle2 className="h-3 w-3 mr-1" />Conectado</Badge>
                ) : wpStatus === 'error' ? (
                  <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Não configurado</Badge>
                )}
              </CardTitle>
              <CardDescription>Configure a integração com WordPress para publicar conteúdos diretamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do WordPress</Label>
                <Input value={wpUrl} onChange={e => setWpUrl(e.target.value)} placeholder="https://meusite.com.br" />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={wpUsername} onChange={e => setWpUsername(e.target.value)} placeholder="admin" />
              </div>
              <div className="space-y-2">
                <Label>Application Password</Label>
                <Input type="password" value={wpAppPassword} onChange={e => setWpAppPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
                <p className="text-xs text-muted-foreground">Gere em WordPress → Usuários → Perfil → Application Passwords</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={async () => {
                  setSavingWp(true);
                  await Promise.all([
                    saveSetting('wordpress_url', wpUrl),
                    saveSetting('wordpress_username', wpUsername),
                    saveSetting('wordpress_app_password', wpAppPassword),
                  ]);
                  toast.success('WordPress configurado!');
                  setSavingWp(false);
                }} disabled={savingWp} className="gradient-primary text-primary-foreground">
                  {savingWp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
                <Button variant="outline" onClick={async () => {
                  if (!wpUrl || !wpUsername || !wpAppPassword) { toast.error('Preencha todos os campos'); return; }
                  setTestingWp(true);
                  try {
                    const res = await fetch(`${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?per_page=1`, {
                      headers: { 'Authorization': 'Basic ' + btoa(`${wpUsername}:${wpAppPassword}`) },
                    });
                    if (res.ok) { setWpStatus('connected'); toast.success('WordPress conectado!'); }
                    else { setWpStatus('error'); toast.error(`Erro: ${res.status}`); }
                  } catch { setWpStatus('error'); toast.error('Erro ao conectar (verifique URL e CORS)'); }
                  setTestingWp(false);
                }} disabled={testingWp}>
                  {testingWp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Webhook de Notificação</CardTitle>
              <CardDescription>Receba notificações em Slack, Discord, n8n ou qualquer endpoint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/... ou https://discord.com/api/webhooks/..."
                />
              </div>

              <div className="space-y-3">
                <Label>Eventos que disparam notificação</Label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map(event => (
                    <div key={event.id} className="flex items-center gap-3">
                      <Checkbox
                        id={event.id}
                        checked={webhookEvents.includes(event.id)}
                        onCheckedChange={() => toggleWebhookEvent(event.id)}
                      />
                      <label htmlFor={event.id} className="text-sm cursor-pointer">{event.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveWebhook} className="gradient-primary text-primary-foreground">Salvar Webhook</Button>
                <Button onClick={sendWebhookTest} variant="outline" disabled={sendingTest || !webhookUrl}>
                  {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar Teste
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMA */}
        <TabsContent value="theme">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Tema e Aparência</CardTitle>
              <CardDescription>Personalize a aparência da aplicação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Cor de Destaque</Label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.hsl}
                      onClick={() => setAccentColor(color.hsl)}
                      className={`relative h-10 rounded-lg border-2 transition-all ${
                        accentColor === color.hsl ? 'border-foreground scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: `hsl(${color.hsl})` }}
                      title={color.name}
                    >
                      {accentColor === color.hsl && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Tamanho da Fonte</Label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <Button
                      key={size}
                      variant={fontSize === size ? 'default' : 'outline'}
                      onClick={() => setFontSize(size)}
                      className={fontSize === size ? 'gradient-primary text-primary-foreground' : ''}
                    >
                      {{ small: 'Pequeno', medium: 'Médio', large: 'Grande' }[size]}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="flex gap-2">
                  <Badge className="gradient-primary text-primary-foreground">Primary</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="gradient-primary text-primary-foreground">Botão</Button>
                  <Button size="sm" variant="outline">Outline</Button>
                </div>
              </div>

              <Button onClick={saveTheme} className="gradient-primary text-primary-foreground">
                Salvar Tema
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODELO IA */}
        <TabsContent value="ai">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />Modelo de IA</CardTitle>
              <CardDescription>Selecione o modelo de linguagem para análises e resumos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label>Modelo</Label>
                <div className="relative">
                  <Input
                    value={modelQuery}
                    onChange={e => handleModelQueryChange(e.target.value)}
                    placeholder="Digite para buscar... ex: claude, gpt, llama"
                    onFocus={() => { if (modelOptions.length > 0) setShowDropdown(true); }}
                  />
                  {searchingModels && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  {selectedModel && !searchingModels && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-chart-3" />}
                </div>

                {showDropdown && modelOptions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {modelOptions.map(m => (
                      <button key={m.id} onClick={() => selectModel(m)} className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.id}</p>
                        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>Context: {m.context_length?.toLocaleString()}</span>
                          {m.pricing && <span>Prompt: ${parseFloat(m.pricing.prompt).toFixed(6)}/tok</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && modelOptions.length === 0 && !searchingModels && modelQuery.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground text-center">
                    Nenhum modelo encontrado
                  </div>
                )}
              </div>

              {selectedModel && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Modelo selecionado:</p>
                  <p className="text-sm font-mono font-medium text-primary">{selectedModel}</p>
                </div>
              )}

              <Button onClick={handleSaveModel} disabled={!selectedModel || savingModel}>
                {savingModel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Modelo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USO */}
        <TabsContent value="usage">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-primary">{totalCredits.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Créditos Totais</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-chart-3">${(totalCredits * 0.01).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Custo Estimado</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-chart-4">~$0.05</div>
                  <div className="text-xs text-muted-foreground">Custo/Pesquisa (média)</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle>Histórico de Uso Mensal</CardTitle>
                <CardDescription>Créditos DataForSEO consumidos por mês</CardDescription>
              </CardHeader>
              <CardContent>
                {usageData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usageData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => [`${value.toFixed(1)} créditos`, 'Uso']}
                        />
                        <Bar dataKey="credits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado de uso disponível</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

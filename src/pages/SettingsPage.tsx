import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Bot, Check } from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string } | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // AI Model
  const [modelQuery, setModelQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [searchingModels, setSearchingModels] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setDisplayName(data.display_name ?? ''); });

    // Load saved model
    supabase.from('app_settings').select('setting_value').eq('user_id', user.id).eq('setting_key', 'ai_model').single()
      .then(({ data }) => {
        if (data) {
          setSelectedModel(data.setting_value);
          setModelQuery(data.setting_value);
        }
      });
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchModels = async (query: string) => {
    if (query.length < 2) { setModelOptions([]); setShowDropdown(false); return; }
    setSearchingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke('model-search', { body: { query } });
      if (error) throw error;
      setModelOptions(data?.models ?? []);
      setShowDropdown(true);
    } catch {
      setModelOptions([]);
    }
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
    const { error } = await supabase.from('app_settings').upsert(
      { user_id: user.id, setting_key: 'ai_model', setting_value: selectedModel, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,setting_key' }
    );
    if (error) toast.error(error.message);
    else toast.success(`Modelo "${selectedModel}" salvo com sucesso!`);
    setSavingModel(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else toast.success('Perfil atualizado!');
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu perfil e preferências</p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Nome de exibição</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={loading} className="gradient-primary text-primary-foreground">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Modelo de IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o modelo de linguagem usado para análises e resumos. Comece a digitar o nome para buscar modelos disponíveis na OpenRouter.
          </p>
          <div className="space-y-2 relative" ref={dropdownRef}>
            <Label>Modelo</Label>
            <div className="relative">
              <Input
                value={modelQuery}
                onChange={e => handleModelQueryChange(e.target.value)}
                placeholder="Digite para buscar... ex: claude, gpt, llama"
                onFocus={() => { if (modelOptions.length > 0) setShowDropdown(true); }}
              />
              {searchingModels && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {selectedModel && !searchingModels && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-chart-3" />
              )}
            </div>

            {showDropdown && modelOptions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {modelOptions.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectModel(m)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                  >
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.id}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>Context: {m.context_length?.toLocaleString()}</span>
                      {m.pricing && (
                        <span>Prompt: ${parseFloat(m.pricing.prompt).toFixed(6)}/tok</span>
                      )}
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
    </div>
  );
}

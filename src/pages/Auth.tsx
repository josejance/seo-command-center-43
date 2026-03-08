import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, BarChart3, FileText } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (showReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else toast.success('Email de recuperação enviado!');
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else navigate('/');
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) toast.error(error.message);
      else toast.success('Conta criada! Verifique seu email.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, hsl(263 70% 20%), hsl(263 70% 50.4%), hsl(280 80% 40%))' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Search className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-white">SEO Command Center</h1>
          </div>
          <p className="text-white/70 text-lg mb-12">
            Pesquise, analise e domine os resultados de busca com inteligência.
          </p>
          <div className="space-y-6 text-left">
            {[
              { icon: Search, label: 'Pesquisa de Keywords', desc: 'Descubra oportunidades com dados reais' },
              { icon: BarChart3, label: 'Análise SERP', desc: 'Entenda a concorrência em detalhes' },
              { icon: FileText, label: 'Criação de Conteúdo', desc: 'Pipeline completo de produção' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{label}</p>
                  <p className="text-white/50 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border/50 bg-card">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Search className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">SEO Command Center</span>
            </div>
            <CardTitle className="text-2xl">
              {showReset ? 'Recuperar Senha' : isLogin ? 'Bem-vindo de volta' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {showReset
                ? 'Insira seu email para receber o link de recuperação'
                : isLogin
                ? 'Entre na sua conta para continuar'
                : 'Comece a dominar o SEO hoje'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !showReset && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!showReset && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading
                  ? 'Carregando...'
                  : showReset
                  ? 'Enviar link'
                  : isLogin
                  ? 'Entrar'
                  : 'Criar conta'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {!showReset && (
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueceu a senha?
                </button>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setShowReset(false); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                </button>
              </div>
              {showReset && (
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Voltar ao login
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

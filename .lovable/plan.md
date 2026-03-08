

## SEO Command Center — Plano de Implementação

### 1. Configuração do Backend (Lovable Cloud)
- Criar tabelas no banco de dados: `profiles`, `projects`, `keywords`, `serp_results`, `content_pieces`, `research_history`
- Tabela `profiles` com `id`, `user_id`, `display_name`, `avatar_url`, criada automaticamente via trigger no signup
- Enums para `source_type`, `keyword_status`, `result_type`, `content_status`
- RLS em todas as tabelas: usuários veem apenas seus próprios dados (via `user_id` direto ou join com `projects`)

### 2. Autenticação
- Página de Login/Registro com design elegante, fundo gradiente roxo/escuro
- Login com email/senha via Supabase Auth
- Redirecionamento automático após login
- Página de reset de senha

### 3. Layout Principal
- Dark mode como padrão com accent roxo (#8B5CF6)
- Sidebar à esquerda com navegação: Dashboard, Projetos, Pesquisa, Análise, Conteúdo, Monitoramento, Configurações
- Sidebar colapsável com ícones no modo mini
- Header com trigger da sidebar e info do usuário

### 4. Páginas Iniciais
- **Dashboard**: visão geral com cards de estatísticas (total de projetos, keywords, conteúdos)
- **Projetos**: listar, criar e gerenciar projetos SEO
- **Pesquisa**: interface para pesquisa de keywords
- **Análise**: visualização de resultados SERP e métricas
- **Conteúdo**: gestão de peças de conteúdo com status (outline → draft → review → final → published)
- **Monitoramento**: histórico de pesquisas e uso de créditos
- **Configurações**: perfil do usuário e preferências

### 5. Funcionalidades Core
- CRUD completo para projetos e keywords
- Associação hierárquica de keywords (parent_keyword_id)
- Visualização de resultados SERP por keyword
- Pipeline de conteúdo com status tracking
- Histórico de pesquisas com custo de créditos


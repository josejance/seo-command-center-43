import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FolderKanban, Search, FileText } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  type: 'project' | 'keyword' | 'content';
  url: string;
  subtitle?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      const q = `%${query}%`;
      const [projects, keywords, content] = await Promise.all([
        supabase.from('projects').select('id, name').ilike('name', q).limit(5),
        supabase.from('keywords').select('id, keyword, project_id').ilike('keyword', q).limit(5),
        supabase.from('content_pieces').select('id, title, keyword_id').ilike('title', q).limit(5),
      ]);

      const r: SearchResult[] = [
        ...(projects.data ?? []).map(p => ({
          id: p.id, title: p.name, type: 'project' as const,
          url: `/projects/${p.id}`,
        })),
        ...(keywords.data ?? []).map(k => ({
          id: k.id, title: k.keyword, type: 'keyword' as const,
          url: `/projects/${k.project_id}`,
        })),
        ...(content.data ?? []).map(c => ({
          id: c.id, title: c.title, type: 'content' as const,
          url: `/content`,
        })),
      ];
      setResults(r);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const icons = { project: FolderKanban, keyword: Search, content: FileText };
  const labels = { project: 'Projetos', keyword: 'Keywords', content: 'Conteúdos' };

  const grouped = results.reduce((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar projetos, keywords, conteúdos..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {Object.entries(grouped).map(([type, items]) => {
          const Icon = icons[type as keyof typeof icons];
          return (
            <CommandGroup key={type} heading={labels[type as keyof typeof labels]}>
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  onSelect={() => { navigate(item.url); setOpen(false); setQuery(''); }}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

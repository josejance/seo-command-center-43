import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ContentList from '@/components/content/ContentList';
import ContentWizard from '@/components/content/ContentWizard';

interface ContentPiece {
  id: string;
  title: string;
  status: string;
  seo_score: number | null;
  created_at: string;
  keyword_id: string;
  keyword_name?: string;
}

export default function ProjectContentStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const loadPieces = useCallback(async () => {
    if (!user || !projectId) return;

    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single();
    if (project) setProjectName(project.name);

    // Get keywords for this project
    const { data: kwData } = await supabase.from('keywords').select('id, keyword').eq('project_id', projectId);
    const kwMap = new Map((kwData ?? []).map(k => [k.id, k.keyword]));
    const kwIds = [...kwMap.keys()];

    if (kwIds.length > 0) {
      const { data: cpData } = await supabase
        .from('content_pieces')
        .select('*')
        .in('keyword_id', kwIds)
        .order('created_at', { ascending: false });

      setPieces((cpData ?? []).map(p => ({
        ...p,
        keyword_name: kwMap.get(p.keyword_id) ?? '—',
      })) as ContentPiece[]);
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { loadPieces(); }, [loadPieces]);

  const handleNew = () => {
    setEditingPieceId(null);
    setView('wizard');
  };

  const handleSelect = (piece: ContentPiece) => {
    setEditingPieceId(piece.id);
    setView('wizard');
  };

  const handleWizardDone = () => {
    setView('list');
    setEditingPieceId(null);
    loadPieces();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => view === 'wizard' ? setView('list') : navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{view === 'wizard' ? 'Content Studio' : 'Conteúdos'}</h1>
          <p className="text-sm text-muted-foreground">{projectName}</p>
        </div>
      </div>

      {view === 'list' ? (
        <ContentList pieces={pieces} onNew={handleNew} onSelect={handleSelect} />
      ) : (
        <ContentWizard projectId={projectId!} onDone={handleWizardDone} editingPieceId={editingPieceId} />
      )}
    </div>
  );
}

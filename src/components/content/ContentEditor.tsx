import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Undo, Redo, Copy, FileDown, Code } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  content: string;
  onChange: (content: string) => void;
  keyword: string;
}

export default function ContentEditor({ content, onChange, keyword }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Comece a escrever ou gere conteúdo com IA...' }),
    ],
    content: markdownToHtml(content),
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(htmlToMarkdown(editor.getHTML()));
      }, 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentHtml = editor.getHTML();
      const newHtml = markdownToHtml(content);
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml);
      }
    }
  }, [content, editor]);

  const copyAsHtml = useCallback(() => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getHTML());
    toast.success('HTML copiado!');
  }, [editor]);

  const copyAsMarkdown = useCallback(() => {
    navigator.clipboard.writeText(content);
    toast.success('Markdown copiado!');
  }, [content]);

  const exportDocx = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyword || 'conteudo'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo exportado!');
  }, [content, keyword]);

  // Count keyword occurrences
  const keywordCount = keyword ? (content.toLowerCase().match(new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const density = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(1) : '0';

  if (!editor) return null;

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="pt-4 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-1 flex-wrap border-b border-border/50 pb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={copyAsHtml}>
            <Code className="mr-1 h-3 w-3" /> HTML
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={copyAsMarkdown}>
            <Copy className="mr-1 h-3 w-3" /> MD
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={exportDocx}>
            <FileDown className="mr-1 h-3 w-3" /> Export
          </Button>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
          <span>{wordCount} palavras</span>
          {keyword && (
            <>
              <span>Keyword "{keyword}": {keywordCount}x</span>
              <span>Densidade: {density}%</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function markdownToHtml(md: string): string {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hulo])/gm, (line) => line.trim() ? `<p>${line}` : '')
    .replace(/(?<![>])$/gm, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hulo])/g, '$1')
    .replace(/(<\/[hulo][^>]*>)<\/p>/g, '$1');
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[uo]l[^>]*>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

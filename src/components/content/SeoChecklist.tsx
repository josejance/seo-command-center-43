import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface Outline {
  title: string;
  meta_description: string;
  h1: string;
  sections: any[];
  estimated_word_count: number;
}

interface Props {
  content: string;
  outline: Outline | null;
  keyword: string;
  secondaryKeywords: string[];
  serpAvgLength?: number;
  onScoreChange: (score: number) => void;
}

interface Check {
  label: string;
  passed: boolean;
  detail: string;
}

export default function SeoChecklist({ content, outline, keyword, secondaryKeywords, serpAvgLength, onScoreChange }: Props) {
  const lower = content.toLowerCase();
  const kwLower = keyword.toLowerCase();
  const words = content.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const checks = useMemo((): Check[] => {
    const kwRegex = new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const kwCount = (content.match(kwRegex) || []).length;
    const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;

    // Check H1/title
    const titleHasKw = (outline?.title ?? '').toLowerCase().includes(kwLower) || (outline?.h1 ?? '').toLowerCase().includes(kwLower);

    // First 100 words
    const first100 = words.slice(0, 100).join(' ').toLowerCase();
    const kwInFirst100 = first100.includes(kwLower);

    // H2 headers with keyword
    const h2Matches = content.match(/^## .+$/gm) || [];
    const h2WithKw = h2Matches.filter(h => h.toLowerCase().includes(kwLower)).length;

    // Meta description
    const metaLen = outline?.meta_description?.length ?? 0;
    const metaOk = metaLen >= 150 && metaLen <= 160;
    const metaHasKw = (outline?.meta_description ?? '').toLowerCase().includes(kwLower);

    // Content length
    const targetLen = serpAvgLength || outline?.estimated_word_count || 1500;
    const lengthOk = wordCount >= targetLen * 0.8;

    // FAQ section
    const hasFaq = /faq|perguntas\s+frequentes|people\s+also\s+ask/i.test(content);

    // Secondary keywords
    const secKwUsed = secondaryKeywords.filter(sk => lower.includes(sk.toLowerCase())).length;
    const secKwOk = secondaryKeywords.length === 0 || secKwUsed >= Math.min(3, secondaryKeywords.length);

    // Density
    const densityOk = density >= 1 && density <= 2;

    return [
      { label: 'Keyword no título (H1)', passed: titleHasKw, detail: titleHasKw ? 'Presente' : 'Adicione a keyword ao título' },
      { label: 'Keyword nos primeiros 100 palavras', passed: kwInFirst100, detail: kwInFirst100 ? 'Presente' : 'Mencione a keyword no início' },
      { label: 'Keyword em pelo menos 2 H2s', passed: h2WithKw >= 2, detail: `${h2WithKw} de 2 H2s contêm a keyword` },
      { label: 'Meta description 150-160 chars', passed: metaOk, detail: `${metaLen} caracteres${metaOk ? '' : ' (ajuste para 150-160)'}` },
      { label: 'Meta description com keyword', passed: metaHasKw, detail: metaHasKw ? 'Presente' : 'Adicione a keyword na meta' },
      { label: 'Comprimento adequado', passed: lengthOk, detail: `${wordCount} de ~${targetLen} palavras` },
      { label: 'Links internos sugeridos (3+)', passed: false, detail: 'Adicione links internos manualmente' },
      { label: 'Seção FAQ/PAA', passed: hasFaq, detail: hasFaq ? 'Presente' : 'Adicione uma seção de FAQ' },
      { label: 'Densidade de keyword 1-2%', passed: densityOk, detail: `${density.toFixed(1)}%${densityOk ? '' : density < 1 ? ' (muito baixa)' : ' (muito alta)'}` },
      { label: 'Keywords secundárias', passed: secKwOk, detail: `${secKwUsed}/${secondaryKeywords.length} usadas` },
    ];
  }, [content, outline, keyword, secondaryKeywords, wordCount, serpAvgLength, lower, kwLower, words]);

  const score = useMemo(() => {
    const passed = checks.filter(c => c.passed).length;
    return Math.round((passed / checks.length) * 100);
  }, [checks]);

  useEffect(() => { onScoreChange(score); }, [score, onScoreChange]);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Checklist SEO</CardTitle>
          <div className={`text-2xl font-bold ${score >= 80 ? 'text-chart-3' : score >= 50 ? 'text-chart-4' : 'text-destructive'}`}>
            {score}
            <span className="text-xs text-muted-foreground font-normal">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-start gap-2 py-1">
            {c.passed ? (
              <CheckCircle className="h-4 w-4 text-chart-3 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

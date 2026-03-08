import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Map } from 'lucide-react';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
}

interface Props {
  keywords: Keyword[];
}

const INTENT_LABELS: Record<string, string> = {
  informational: 'Informacional',
  commercial: 'Comercial',
  transactional: 'Transacional',
  navigational: 'Navegacional',
};

function kdToColor(kd: number): string {
  if (kd <= 20) return 'hsl(150, 60%, 45%)';
  if (kd <= 40) return 'hsl(120, 50%, 50%)';
  if (kd <= 60) return 'hsl(45, 90%, 55%)';
  if (kd <= 80) return 'hsl(15, 80%, 55%)';
  return 'hsl(0, 63%, 51%)';
}

const CustomContent = (props: any) => {
  const { x, y, width, height, name, kd } = props;
  if (width < 20 || height < 20) return null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={kdToColor(kd ?? 50)} stroke="hsl(240, 4%, 10%)" strokeWidth={1} fillOpacity={0.85} />
      {width > 50 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={Math.min(12, width / 8)} fontWeight="500">
          {name?.length > width / 7 ? name.slice(0, Math.floor(width / 7)) + '…' : name}
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold">{d.name}</p>
      <p className="text-xs text-muted-foreground mt-1">Volume: {d.size?.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">KD: {d.kd}</p>
      <p className="text-xs text-muted-foreground">Intent: {d.intent}</p>
    </div>
  );
};

export default function IntentMapSection({ keywords }: Props) {
  const intentGroups = useMemo(() => {
    const groups: Record<string, { name: string; children: any[] }> = {};
    const intents = ['informational', 'commercial', 'transactional', 'navigational'];
    intents.forEach(i => {
      groups[i] = { name: INTENT_LABELS[i], children: [] };
    });

    keywords.forEach(kw => {
      const intent = kw.search_intent?.toLowerCase() || 'informational';
      const key = intents.includes(intent) ? intent : 'informational';
      if ((kw.search_volume ?? 0) > 0) {
        groups[key].children.push({
          name: kw.keyword,
          size: kw.search_volume ?? 1,
          kd: kw.keyword_difficulty ?? 50,
          intent: INTENT_LABELS[key],
        });
      }
    });

    return Object.values(groups).filter(g => g.children.length > 0);
  }, [keywords]);

  const treemapData = useMemo(() => {
    const allItems: any[] = [];
    intentGroups.forEach(g => {
      g.children.forEach(c => allItems.push(c));
    });
    return allItems;
  }, [intentGroups]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Map className="h-5 w-5 text-primary" /> Mapa de Intenções
      </h3>

      {treemapData.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma keyword com volume disponível.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(150,60%,45%)' }} /> KD 0-20</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(120,50%,50%)' }} /> KD 21-40</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(45,90%,55%)' }} /> KD 41-60</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(15,80%,55%)' }} /> KD 61-80</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'hsl(0,63%,51%)' }} /> KD 81+</span>
          </div>
          <Card className="bg-card border-border/50">
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  stroke="hsl(240, 4%, 10%)"
                  content={<CustomContent />}
                >
                  <Tooltip content={<CustomTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

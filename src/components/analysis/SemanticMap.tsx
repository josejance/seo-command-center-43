import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
  source_type: string;
  parent_keyword_id: string | null;
}

interface Props {
  keywords: Keyword[];
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  intent: string | null;
  sourceType: string;
  isMain: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const INTENT_COLORS: Record<string, string> = {
  informational: 'hsl(200, 70%, 50%)',
  commercial: 'hsl(30, 80%, 55%)',
  transactional: 'hsl(150, 60%, 45%)',
  navigational: 'hsl(263, 70%, 50%)',
};

const DIFFICULTY_COLORS = (d: number) => {
  if (d < 30) return 'hsl(150, 60%, 45%)';
  if (d < 60) return 'hsl(45, 93%, 47%)';
  return 'hsl(0, 72%, 51%)';
};

export default function SemanticMap({ keywords }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
  const [colorMode, setColorMode] = useState<'intent' | 'difficulty'>('difficulty');

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || keywords.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = expanded ? 700 : 450;

    // Build nodes & links
    const mainKeywords = keywords.filter(k => k.source_type === 'main');
    const childKeywords = keywords.filter(k => k.parent_keyword_id);

    const nodeMap = new Map<string, GraphNode>();
    mainKeywords.forEach(k => {
      nodeMap.set(k.id, {
        id: k.id,
        keyword: k.keyword,
        volume: k.search_volume ?? 100,
        difficulty: k.keyword_difficulty ?? 50,
        intent: k.search_intent,
        sourceType: k.source_type,
        isMain: true,
      });
    });

    childKeywords.forEach(k => {
      if (!nodeMap.has(k.id)) {
        nodeMap.set(k.id, {
          id: k.id,
          keyword: k.keyword,
          volume: k.search_volume ?? 50,
          difficulty: k.keyword_difficulty ?? 50,
          intent: k.search_intent,
          sourceType: k.source_type,
          isMain: false,
        });
      }
    });

    // Limit to 80 nodes for performance
    const nodes = Array.from(nodeMap.values()).slice(0, 80);
    const nodeIds = new Set(nodes.map(n => n.id));

    const links: GraphLink[] = childKeywords
      .filter(k => k.parent_keyword_id && nodeIds.has(k.id) && nodeIds.has(k.parent_keyword_id!))
      .map(k => ({ source: k.parent_keyword_id!, target: k.id }));

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Add zoom
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(nodes, n => n.volume) ?? 1000])
      .range([6, 35]);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>(d => radiusScale(d.volume) + 4));

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsl(240, 4%, 25%)')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1);

    // Nodes
    const node = g.append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => radiusScale(d.volume))
      .attr('fill', d => {
        if (colorMode === 'intent') return INTENT_COLORS[d.intent?.toLowerCase() ?? ''] ?? 'hsl(240, 5%, 50%)';
        return DIFFICULTY_COLORS(d.difficulty);
      })
      .attr('stroke', d => d.isMain ? 'hsl(0, 0%, 95%)' : 'transparent')
      .attr('stroke-width', d => d.isMain ? 2 : 0)
      .attr('opacity', 0.85)
      .attr('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', 'hsl(0, 0%, 100%)').attr('stroke-width', 2);
        const rect = container.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 10, node: d });
      })
      .on('mouseout', function(_, d) {
        d3.select(this)
          .attr('opacity', 0.85)
          .attr('stroke', d.isMain ? 'hsl(0, 0%, 95%)' : 'transparent')
          .attr('stroke-width', d.isMain ? 2 : 0);
        setTooltip(null);
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Labels for main keywords
    const labels = g.append('g')
      .selectAll('text')
      .data(nodes.filter(n => n.isMain))
      .join('text')
      .text(d => d.keyword.length > 20 ? d.keyword.slice(0, 18) + '…' : d.keyword)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(0, 0%, 90%)')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .attr('dy', d => radiusScale(d.volume) + 14);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('cx', d => d.x!).attr('cy', d => d.y!);
      labels.attr('x', d => d.x!).attr('y', d => d.y!);
    });

    return () => { simulation.stop(); };
  }, [keywords, expanded, colorMode]);

  if (keywords.length === 0) {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">Nenhuma keyword disponível para visualização. Faça pesquisas primeiro.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Mapa Semântico</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button size="sm" variant={colorMode === 'difficulty' ? 'default' : 'outline'} onClick={() => setColorMode('difficulty')} className={colorMode === 'difficulty' ? 'gradient-primary text-primary-foreground' : ''}>
              Dificuldade
            </Button>
            <Button size="sm" variant={colorMode === 'intent' ? 'default' : 'outline'} onClick={() => setColorMode('intent')} className={colorMode === 'intent' ? 'gradient-primary text-primary-foreground' : ''}>
              Intenção
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} aria-label="Toggle fullscreen">
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative" ref={containerRef}>
        <svg ref={svgRef} className="w-full rounded-lg bg-background/50" style={{ height: expanded ? 700 : 450 }} />

        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none bg-popover border border-border rounded-lg p-3 shadow-lg max-w-[220px]"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          >
            <p className="font-semibold text-sm truncate">{tooltip.node.keyword}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-xs">Vol: {tooltip.node.volume.toLocaleString()}</Badge>
              <Badge variant="outline" className="text-xs">KD: {tooltip.node.difficulty}%</Badge>
              {tooltip.node.intent && <Badge variant="outline" className="text-xs">{tooltip.node.intent}</Badge>}
              <Badge variant="secondary" className="text-xs">{tooltip.node.sourceType}</Badge>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          {colorMode === 'difficulty' ? (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(150, 60%, 45%)' }} />Fácil (&lt;30)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(45, 93%, 47%)' }} />Média (30-60)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(0, 72%, 51%)' }} />Difícil (&gt;60)</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(200, 70%, 50%)' }} />Informational</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(30, 80%, 55%)' }} />Commercial</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(150, 60%, 45%)' }} />Transactional</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: 'hsl(263, 70%, 50%)' }} />Navigational</span>
            </>
          )}
          <span className="ml-auto">Tamanho = volume de busca · Arraste para mover</span>
        </div>
      </CardContent>
    </Card>
  );
}

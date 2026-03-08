import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projetos',
  research: 'Pesquisa',
  analysis: 'Análise',
  content: 'Conteúdo',
  monitoring: 'Monitoramento',
  settings: 'Configurações',
  automation: 'Automação',
  monitor: 'Monitoramento',
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = routeLabels[seg] || (seg.length > 20 ? seg.slice(0, 8) + '…' : seg);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.path}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

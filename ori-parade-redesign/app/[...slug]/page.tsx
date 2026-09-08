import { notFound } from 'next/navigation';
import PageScreen from '../screens';
import { allRoutes, routeAliases, catalogRoutes } from '../routes';
import Parade from '../parade';
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const route = '/' + slug.join('/');
  if (!allRoutes.includes(route)) notFound();
  if (catalogRoutes.includes(route)) return <Parade initialCategory={route.endsWith('Pokemon') ? 'ポケモン' : route.endsWith('OnePiece') ? 'ワンピース' : 'すべて'} />;
  return <PageScreen route={routeAliases[route] || route} />;
}

export function generateStaticParams() {
  return allRoutes.map((route) => ({ slug: route.slice(1).split('/') }));
}

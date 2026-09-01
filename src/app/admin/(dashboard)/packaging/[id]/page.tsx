import PackagingDetailClient from '@/components/packaging/packaging-detail-client';

export default async function PackagingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackagingDetailClient id={id} />;
}

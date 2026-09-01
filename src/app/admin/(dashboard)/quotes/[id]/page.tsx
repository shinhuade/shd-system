import QuotationDetailClient from '@/components/quotation/quotation-detail-client';

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuotationDetailClient id={id} />;
}

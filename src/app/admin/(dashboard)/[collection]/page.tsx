import AdminGenericList from '@/components/admin-generic-list';
import { notFound } from 'next/navigation';
import { AdminConfig } from '@/types/admin-config';
import { modelMap } from '@/lib/model-map';

interface AdminPageProps {
  params: Promise<{
    collection: string;
  }>;
}

export async function generateStaticParams() {
  // 告訴 Next.js 哪些 collection 是合法的
  // 這樣編譯時就會幫你產出 admin/user, admin/product 的靜態 HTML
  return Object.keys(modelMap).map((collection) => ({
    collection: collection,
  }));
}

export async function getConfig(collection: string): Promise<AdminConfig | null> {
  try {
    const configModule = await import(`@/configs/admin/${collection}.json`);
    return configModule.default as AdminConfig;
  } catch {
    return null;
  }
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { collection } = await params;

  const config = await getConfig(collection);
  if (!config) {
    notFound();
  }

  return <AdminGenericList config={config} />;
}

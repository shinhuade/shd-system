import AdminGenericForm from '@/components/admin-generic-form';
import { getConfig } from '../page';

interface AdminFormProps {
  params: Promise<{
    collection: string;
    id: string;
  }>;
}

export default async function AdminForm({ params }: AdminFormProps) {
  const { collection, id } = await params;

  const config = await getConfig(collection);

  if (!config) return;

  return <AdminGenericForm config={config} id={id} />;
}

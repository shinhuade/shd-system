import { getApiDocs } from '@/lib/swagger';
import SwaggerViewer from '@/components/swagger-viewer';

export const dynamic = 'force-dynamic';

export default async function ApiDocsPage() {
  const spec = getApiDocs();

  return (
    <main style={{ padding: '20px' }}>
      <SwaggerViewer spec={spec} />
    </main>
  );
}

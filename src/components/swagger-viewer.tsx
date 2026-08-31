'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerViewerProps {
  spec: object;
}

export default function SwaggerViewer({ spec }: SwaggerViewerProps) {
  return (
    <div className="swagger-wrapper">
      <SwaggerUI spec={spec} />
    </div>
  );
}

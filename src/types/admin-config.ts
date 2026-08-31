export type JsonSchemaPrimitiveType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export interface AdminListColumnConfig {
  title: string;
  key: string;
  dataIndex: string;
  renderType?: string;
}

export interface AdminSortOption {
  label: string;
  value: string;
}

export interface AdminFormSchemaProperty {
  type: JsonSchemaPrimitiveType | JsonSchemaPrimitiveType[];
  title?: string;
  [key: string]: unknown;
}

export interface AdminFormSpec {
  schema: {
    title?: string;
    type: 'object';
    required?: string[];
    properties: Record<string, AdminFormSchemaProperty>;
    [key: string]: unknown;
  };
  uiSchema?: Record<string, Record<string, unknown>>;
}

export interface AdminConfig {
  name: string;
  collection: string;
  path: string;
  searchFields: string[];
  renderDelete: boolean;
  columns: AdminListColumnConfig[];
  sortOptions: AdminSortOption[];
  formSpec?: AdminFormSpec;
}

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

/**
 * 列表上方的分頁篩選器。每個選項對單一欄位做等值篩選，
 * value 留空代表不套用任何條件（例如「全部」）。
 */
export interface AdminFilterOption {
  label: string;
  /** 要篩選的欄位；留空表示此選項不篩選 */
  field?: string;
  /** 要比對的值（字串，後端依欄位型別轉換）；留空表示此選項不篩選 */
  value?: string;
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
  /** 選填：列表上方的分頁篩選器，第一個為預設 */
  filters?: AdminFilterOption[];
  formSpec?: AdminFormSpec;
}

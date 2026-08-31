'use client';

import { ReactNode } from 'react';
import { AdminListColumnConfig } from '@/types/admin-config';
import { Image } from 'antd';

type TableRender = (val: unknown) => ReactNode;
type CollectionMapItem = Record<string, unknown> & { _id?: string };
type CollectionMap = Record<string, CollectionMapItem[]>;

type AdminColumnWithRender = AdminListColumnConfig & {
  render?: TableRender;
};

export const customColumns = (
  columns: AdminListColumnConfig[],
  collectionMap: CollectionMap = {},
): AdminColumnWithRender[] => {
  return columns.map((col) => {
    let renderFn: TableRender | null = null;

    if (['createdAt', 'updatedAt'].includes(col.key)) {
      renderFn = (val) => {
        if (!val) return '-';
        return new Date(val as string | number | Date).toLocaleString('sv');
      };
    } else if (col.renderType === 'image') {
      renderFn = (val) => {
        const src = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
        if (!src) return '-';
        return <Image width={100} src={src} style={{ aspectRatio: '1/1', objectFit: 'cover' }} alt={src} />;
      };
    }

    return renderFn ? { ...col, render: renderFn } : col;
  });
};

'use client';

import { Table } from 'antd';
import dayjs from 'dayjs';

export interface PriceHistoryRow {
  _id: string;
  effectiveDate: string;
  note?: string;
  [key: string]: unknown;
}

export default function PriceHistoryTable({
  history,
  valueField,
  valueLabel,
  loading,
  formatValue = (v: number) => `$${v.toLocaleString()}`,
}: {
  history: PriceHistoryRow[];
  valueField: string;
  valueLabel: string;
  loading?: boolean;
  formatValue?: (value: number) => string;
}) {
  return (
    <Table
      rowKey="_id"
      loading={loading}
      size="small"
      pagination={{ pageSize: 8 }}
      dataSource={history}
      columns={[
        {
          title: '生效日期',
          dataIndex: 'effectiveDate',
          key: 'effectiveDate',
          render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
        },
        {
          title: valueLabel,
          dataIndex: valueField,
          key: valueField,
          render: (v: number) => formatValue(v ?? 0),
        },
        { title: '備註', dataIndex: 'note', key: 'note', ellipsis: true },
      ]}
    />
  );
}

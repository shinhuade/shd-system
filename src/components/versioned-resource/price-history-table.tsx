'use client';

import { Button, Popconfirm, Space } from 'antd';
import { Pen, Trash } from '@styled-icons/fa-solid';
import dayjs from 'dayjs';
import ResponsiveTable, { ResponsiveColumn } from '@/components/responsive-table';

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
  onEdit,
  onDelete,
}: {
  history: PriceHistoryRow[];
  valueField: string;
  valueLabel: string;
  loading?: boolean;
  formatValue?: (value: number) => string;
  onEdit?: (row: PriceHistoryRow) => void;
  onDelete?: (row: PriceHistoryRow) => void;
}) {
  const showActions = Boolean(onEdit || onDelete);

  return (
    <ResponsiveTable<PriceHistoryRow>
      rowKey="_id"
      loading={loading}
      size="small"
      pagination={{ pageSize: 8 }}
      dataSource={history}
      emptyText="尚無歷史版本"
      columns={[
        {
          title: '生效日期',
          dataIndex: 'effectiveDate',
          key: 'effectiveDate',
          mobilePrimary: true,
          render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
        },
        {
          title: valueLabel,
          dataIndex: valueField,
          key: valueField,
          render: (v: number) => formatValue(v ?? 0),
        },
        { title: '備註', dataIndex: 'note', key: 'note', ellipsis: true },
        ...(showActions
          ? ([
              {
                title: '操作',
                key: 'action',
                width: 96,
                render: (_: unknown, row: PriceHistoryRow) => (
                  <Space size={4}>
                    {onEdit && (
                      <Button size="small" type="text" icon={<Pen size={12} />} onClick={() => onEdit(row)} />
                    )}
                    {onDelete && (
                      <Popconfirm title="確定要刪除這筆歷史版本嗎？" onConfirm={() => onDelete(row)} okText="刪除" cancelText="取消">
                        <Button size="small" type="text" danger icon={<Trash size={12} />} />
                      </Popconfirm>
                    )}
                  </Space>
                ),
              },
            ] as ResponsiveColumn<PriceHistoryRow>[])
          : []),
      ]}
    />
  );
}

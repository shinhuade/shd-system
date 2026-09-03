'use client';

import { Fragment, ReactNode, useState } from 'react';
import styled from 'styled-components';
import { Button, Card, Empty, Pagination, Skeleton, Space, Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { ChevronDown, ChevronUp } from '@styled-icons/fa-solid';
import { useIsMobile } from '@/hooks/use-media-query';

type RowRecord = object;

export type ResponsiveColumn<T> = ColumnType<T> & {
  /** 手機版卡片的主標題欄位（未指定時取第一欄） */
  mobilePrimary?: boolean;
  /** 手機版卡片右上角的操作欄（未指定時取 key === 'action' 的欄位） */
  mobileAction?: boolean;
  /** 手機版不顯示此欄，避免卡片過長 */
  mobileHidden?: boolean;
};

export interface ResponsiveTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ResponsiveColumn<T>[];
  /** 手機版沒有資料時顯示的文字 */
  emptyText?: string;
}

function resolveRowKey<T extends RowRecord>(record: T, index: number, rowKey: TableProps<T>['rowKey']): string {
  if (typeof rowKey === 'function') return String(rowKey(record, index));
  if (typeof rowKey === 'string') return String((record as Record<string, unknown>)[rowKey] ?? index);
  return String(index);
}

/** 依 dataIndex（可為巢狀陣列）取值，再交給 column.render 產生畫面內容 */
function renderCell<T extends RowRecord>(column: ResponsiveColumn<T>, record: T, index: number): ReactNode {
  const { dataIndex, render } = column;
  const row = record as Record<string, unknown>;
  let value: unknown;

  if (Array.isArray(dataIndex)) {
    value = dataIndex.reduce<unknown>(
      (acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key as string]),
      record,
    );
  } else if (dataIndex != null) {
    value = row[dataIndex as string];
  }

  if (render) {
    const rendered = render(value, record, index);
    // antd 允許 render 回傳 { children, props } 形式來合併儲存格，卡片版只取 children
    if (rendered && typeof rendered === 'object' && 'children' in rendered) {
      return rendered.children as ReactNode;
    }
    return rendered as ReactNode;
  }

  if (value == null || value === '') return '-';
  return value as ReactNode;
}

/**
 * 桌機維持原本的 antd Table，手機版自動改成一列一張卡片的閱讀版型，
 * 免去左右捲動整個表格才能看完一筆資料。
 */
export default function ResponsiveTable<T extends RowRecord>({
  columns,
  dataSource,
  rowKey,
  loading,
  pagination,
  onRow,
  expandable,
  emptyText = '目前沒有資料',
  ...rest
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const [internalPage, setInternalPage] = useState(1);

  if (!isMobile) {
    return (
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        pagination={pagination}
        onRow={onRow}
        expandable={expandable}
        scroll={{ x: 'max-content' }}
        {...rest}
      />
    );
  }

  const rows = (dataSource as T[] | undefined) ?? [];
  const visibleColumns = columns.filter((column) => !column.mobileHidden);
  const primaryColumn = visibleColumns.find((column) => column.mobilePrimary) ?? visibleColumns[0];
  const actionColumn =
    visibleColumns.find((column) => column.mobileAction) ?? visibleColumns.find((column) => column.key === 'action');
  const detailColumns = visibleColumns.filter((column) => column !== primaryColumn && column !== actionColumn);

  const paginationConfig = pagination === false || pagination === undefined ? undefined : pagination;
  const pageSize = paginationConfig?.pageSize ?? 10;
  const currentPage = paginationConfig?.current ?? internalPage;
  const total = paginationConfig?.total ?? rows.length;
  // 後端分頁時 dataSource 只有當頁資料，不能再自行切片
  const isServerPaged = Boolean(paginationConfig?.total && paginationConfig.total > rows.length);
  const pagedRows =
    pagination === false || isServerPaged ? rows : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const expandedKeys = (expandable?.expandedRowKeys ?? []).map(String);

  if (loading) {
    return (
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} size="small">
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </Space>
    );
  }

  if (pagedRows.length === 0) {
    return <Empty description={emptyText} />;
  }

  return (
    <div>
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {pagedRows.map((record, index) => {
          const key = resolveRowKey(record, index, rowKey);
          const rowProps = onRow?.(record, index);
          const isExpanded = expandedKeys.includes(key);

          return (
            <Card
              key={key}
              size="small"
              styles={{ body: { padding: 14 } }}
              onClick={rowProps?.onClick as React.MouseEventHandler<HTMLDivElement> | undefined}
              style={rowProps?.onClick ? { cursor: 'pointer' } : undefined}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {primaryColumn ? renderCell(primaryColumn, record, index) : null}
                </div>
                {actionColumn && <ActionArea onClick={(e) => e.stopPropagation()}>{renderCell(actionColumn, record, index)}</ActionArea>}
              </div>

              {detailColumns.length > 0 && (
                <dl style={{ margin: '10px 0 0', display: 'grid', gap: 6 }}>
                  {detailColumns.map((column) => (
                    <Fragment key={String(column.key ?? column.dataIndex)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <dt style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, flexShrink: 0 }}>
                          {column.title as ReactNode}
                        </dt>
                        <dd style={{ margin: 0, textAlign: 'right', wordBreak: 'break-word' }}>
                          {renderCell(column, record, index)}
                        </dd>
                      </div>
                    </Fragment>
                  ))}
                </dl>
              )}

              {expandable?.expandedRowRender && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="link"
                    size="small"
                    style={{ paddingLeft: 0, marginTop: 8 }}
                    icon={isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    onClick={() => expandable.onExpand?.(!isExpanded, record)}
                  >
                    {isExpanded ? '收合明細' : '查看明細'}
                  </Button>
                  {isExpanded && (
                    <div style={{ marginTop: 8 }}>{expandable.expandedRowRender(record, index, 0, true)}</div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </Space>

      {pagination !== false && total > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Pagination
            simple
            size="small"
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={(page, size) => {
              setInternalPage(page);
              paginationConfig?.onChange?.(page, size);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** 卡片右上角的操作區：把 antd 小尺寸按鈕撐到手指點得到的大小 */
const ActionArea = styled.div`
  flex-shrink: 0;

  .ant-btn {
    min-width: 36px;
    height: 36px;
  }
`;

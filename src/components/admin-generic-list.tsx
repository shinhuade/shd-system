'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminConfig } from '@/types/admin-config';
import styled from 'styled-components';
import { Typography, Table, Space, Button, Popconfirm, Input, Select, App, Grid } from 'antd';
import { customColumns } from './custom-render-generic';
import type { TablePaginationConfig } from 'antd';

const { Title } = Typography;
const { Search } = Input;

interface AdminGenericListProps {
  config: AdminConfig;
}

interface BaseData {
  _id: string;
  [key: string]: unknown;
}

type CollectionMapState = Record<string, BaseData[]>;

export default function AdminGenericList({ config }: AdminGenericListProps) {
  const { collection, name, columns, renderDelete, sortOptions, searchFields, path } = config;
  const { message } = App.useApp();
  const router = useRouter();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const [data, setData] = useState<BaseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sort, setSort] = useState<string>(sortOptions[0]?.value);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [keyword, setKeyword] = useState<string>();
  const [collectionMap, setCollectionMap] = useState<CollectionMapState>({});

  const { current, pageSize } = pagination;

  const memoizedSearchFields = useMemo(() => searchFields?.join(',') || '', [searchFields]);

  const dynamicCollections = useMemo(() => {
    const targets = new Set<string>();

    columns.forEach((col) => {
      const renderType = col.renderType;
      if (renderType?.startsWith('collection_')) {
        const mappedCollection = renderType.replace('collection_', '');
        if (mappedCollection) {
          targets.add(mappedCollection);
        }
      }
    });

    return Array.from(targets);
  }, [columns]);

  useEffect(() => {
    let mounted = true;

    const setupDataMap = async () => {
      if (dynamicCollections.length === 0) {
        if (mounted) setCollectionMap({});
        return;
      }

      try {
        const responses = await Promise.all(
          dynamicCollections.map(async (target) => {
            const resp = await fetch(`/api/generic/${target}/all`, { method: 'GET' });
            const result = await resp.json();

            return {
              target,
              data: Array.isArray(result?.data) ? (result.data as BaseData[]) : [],
            };
          }),
        );

        if (!mounted) return;

        const nextCollectionMap: CollectionMapState = responses.reduce<CollectionMapState>((acc, item) => {
          acc[item.target] = item.data;
          return acc;
        }, {});

        setCollectionMap(nextCollectionMap);
      } catch (err) {
        console.error('DataMap fetch error:', err);
      }
    };

    setupDataMap();

    return () => {
      mounted = false;
    };
  }, [dynamicCollections]);

  const fetchData = useCallback(
    async (current = 1, pageSize = 10, searchKey = '') => {
      try {
        const params = {
          ...(searchKey && {
            fields: memoizedSearchFields,
            keyword: searchKey,
          }),
          page: current.toString(),
          limit: pageSize.toString(),
          sort: sort,
        };
        const query = new URLSearchParams(params).toString();
        const resp = await fetch(`/api/generic/${collection}?${query}`, { method: 'GET' });
        const result = await resp.json();

        return result;
      } catch (err) {
        console.error('Fetch error:', err);
      }
    },
    [collection, sort, memoizedSearchFields],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const resp = await fetch(`/api/generic/${collection}/${id}`, { method: 'DELETE' });
        if (resp.ok) {
          const result = await fetchData(current, pageSize, keyword);
          setData(result.data);
          setPagination((prev) => ({ ...prev, total: result.total }));
          message.success('已刪除');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        message.success('刪除失敗');
      }
    },
    [collection, message, fetchData, current, pageSize, keyword],
  );

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      setLoading(true);
      const result = await fetchData(current, pageSize, keyword);
      if (mounted && result) {
        setData(result.data);
        setPagination((prev) => ({ ...prev, total: result.total }));
      }
      setLoading(false);
    };

    setup();

    return () => {
      mounted = false;
    };
  }, [fetchData, current, pageSize, keyword]);

  const renderColumns = useMemo(() => {
    return [
      ...customColumns(columns, collectionMap),
      {
        title: '操作',
        key: 'actions',
        dataIndex: 'actions',
        render: (_: unknown, { _id }: { _id: string }) => (
          <Space>
            <Button
              onClick={() => {
                router.push(`/admin/${path}/${_id}`);
              }}
            >
              編輯
            </Button>
            {renderDelete && (
              <Popconfirm title="確定刪除嗎？" okText="是" cancelText="否" onConfirm={() => handleDelete(_id)}>
                <Button danger>刪除</Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ];
  }, [columns, renderDelete, handleDelete, router, path, collectionMap]);

  const mobileColumns = useMemo(() => customColumns(columns, collectionMap), [columns, collectionMap]);

  const tableDataSource = useMemo(() => {
    if (!isMobile) return data;

    return data.map((item) => ({
      ...item,
      __vertical: (
        <div className="mobile-item">
          {mobileColumns.map((col) => {
            const value = item[col.dataIndex as string];
            const displayValue = col.render ? col.render(value) : (value as React.ReactNode) || '-';

            return (
              <div key={col.key} className="mobile-row">
                <div className="mobile-label">{col.title}</div>
                <div className="mobile-value">{displayValue}</div>
              </div>
            );
          })}
          <div className="mobile-actions">
            <Button
              onClick={() => {
                router.push(`/admin/${path}/${item._id}`);
              }}
            >
              編輯
            </Button>
            {renderDelete && (
              <Popconfirm title="確定刪除嗎？" okText="是" cancelText="否" onConfirm={() => handleDelete(item._id)}>
                <Button danger>刪除</Button>
              </Popconfirm>
            )}
          </div>
        </div>
      ),
    }));
  }, [isMobile, data, mobileColumns, router, renderDelete, handleDelete, path]);

  const finalColumns = useMemo(() => {
    if (!isMobile) return renderColumns;
    return [
      {
        title: '',
        key: '__vertical',
        dataIndex: '__vertical',
      },
    ];
  }, [isMobile, renderColumns]);

  return (
    <Wrapper>
      <Title level={3} style={{ marginBottom: 24 }}>
        {name}列表
      </Title>
      <Filter>
        <Search
          style={{ maxWidth: 200 }}
          allowClear
          enterButton
          onSearch={(val) => {
            setKeyword(val);
            setPagination((prev) => ({
              ...prev,
              current: 1,
            }));
          }}
        />
        <Select id="admin-sort-select" options={sortOptions} defaultValue={sort} onChange={(val) => setSort(val)} />
        <Button
          type="primary"
          onClick={() => {
            router.push(`/admin/${path}/create`);
          }}
        >
          新增
        </Button>
      </Filter>
      <Table
        columns={finalColumns}
        dataSource={tableDataSource}
        rowKey="_id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 筆`,
          locale: {
            items_per_page: '筆 / 頁',
          },
          pageSizeOptions: ['10', '20'],
        }}
        onChange={({ current, pageSize }) => {
          setPagination((prev) => ({
            ...prev,
            current: current ?? 1,
            pageSize: pageSize ?? 10,
          }));
        }}
      />
    </Wrapper>
  );
}

const Wrapper = styled.section`
  padding: 32px;
  background: #fff;
  height: 100%;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .mobile-item {
    display: grid;
    gap: 10px;
  }

  .mobile-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #f0f0f0;
  }

  .mobile-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .mobile-label {
    color: #666;
    font-size: 13px;
    line-height: 1.5;
  }

  .mobile-value {
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  }

  .mobile-actions {
    margin-top: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  justify-content: end;
`;

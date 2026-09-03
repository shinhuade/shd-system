'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Button, Card, Input, Tag } from 'antd';
import { Plus } from '@styled-icons/fa-solid';
import dayjs from 'dayjs';
import PageHeader from '@/components/page-header';
import ResponsiveTable from '@/components/responsive-table';

interface QuoteRow {
  _id: string;
  quotationNo: string;
  quoteMode?: 'wizard' | 'quick' | 'precision';
  quotationDate: string;
  status: string;
  chosenPrice: number;
  marginRatePercent: number;
  customer?: { name: string };
  workpieceNames: string[];
}

export default function QuotesListPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<QuoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (keyword) params.set('keyword', keyword);
        const res = await fetch(`/api/admin/quotes/search?${params.toString()}`);
        const result = await res.json();
        if (!mounted) return;
        setData(result?.data || []);
        setTotal(result?.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [keyword, page]);

  return (
    <section>
      <PageHeader
        title="報價紀錄"
        description="搜尋客戶或工件名稱，快速找到過去的報價"
        extra={
          <Button type="primary" icon={<Plus size={14} />} onClick={() => router.push('/admin/quotes/new')}>
            新增報價
          </Button>
        }
      />

      <Card variant="borderless">
        <Input.Search
          placeholder="搜尋客戶或工件名稱"
          allowClear
          size="large"
          style={{ width: '100%', maxWidth: 360, marginBottom: 16 }}
          onSearch={(v) => {
            setPage(1);
            setKeyword(v);
          }}
        />
        <ResponsiveTable<QuoteRow>
          rowKey="_id"
          loading={loading}
          dataSource={data}
          onRow={(record) => ({ onClick: () => router.push(`/admin/quotes/${record._id}`), style: { cursor: 'pointer' } })}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
          emptyText="找不到符合條件的報價"
          columns={[
            {
              title: '報價單號',
              dataIndex: 'quotationNo',
              key: 'quotationNo',
              mobilePrimary: true,
              render: (v: string, record) => (
                <span>
                  {v}
                  {record.quoteMode === 'precision' && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      精算
                    </Tag>
                  )}
                  <MobileOnlyCustomer>{record.customer?.name ? `　${record.customer.name}` : ''}</MobileOnlyCustomer>
                </span>
              ),
            },
            { title: '日期', dataIndex: 'quotationDate', key: 'quotationDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
            { title: '客戶', dataIndex: ['customer', 'name'], key: 'customer', mobileHidden: true },
            { title: '工件', dataIndex: 'workpieceNames', key: 'workpieceNames', render: (v: string[]) => v?.join('、') },
            {
              title: '報價',
              dataIndex: 'chosenPrice',
              key: 'chosenPrice',
              render: (v: number) => <strong>${Math.round(v).toLocaleString()}</strong>,
            },
            { title: '毛利率', dataIndex: 'marginRatePercent', key: 'marginRatePercent', render: (v: number) => `${v.toFixed(1)}%` },
            {
              title: '狀態',
              dataIndex: 'status',
              key: 'status',
              // 手機版顯示在卡片右上角，一眼分辨正式／草稿
              mobileAction: true,
              render: (v: string) => <Tag color={v === 'final' ? 'green' : 'default'}>{v === 'final' ? '正式' : '草稿'}</Tag>,
            },
          ]}
        />
      </Card>
    </section>
  );
}

/** 手機版把客戶名稱併到單號旁，卡片一眼就知道是誰的報價 */
const MobileOnlyCustomer = styled.span`
  display: none;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  font-weight: 400;

  @media (max-width: 768px) {
    display: inline;
  }
`;

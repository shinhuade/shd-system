'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Table, Tag } from 'antd';
import { Plus } from '@styled-icons/fa-solid';
import dayjs from 'dayjs';

interface QuoteRow {
  _id: string;
  quotationNo: string;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>報價紀錄</h1>
          <p style={{ color: 'rgba(0,0,0,0.45)' }}>搜尋客戶或工件名稱，快速找到過去的報價</p>
        </div>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => router.push('/admin/quotes/new')}>
          新增報價
        </Button>
      </div>

      <Card variant="borderless">
        <Input.Search
          placeholder="搜尋客戶或工件名稱"
          allowClear
          style={{ maxWidth: 360, marginBottom: 16 }}
          onSearch={(v) => {
            setPage(1);
            setKeyword(v);
          }}
        />
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data}
          onRow={(record) => ({ onClick: () => router.push(`/admin/quotes/${record._id}`), style: { cursor: 'pointer' } })}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
          columns={[
            { title: '報價單號', dataIndex: 'quotationNo', key: 'quotationNo' },
            { title: '日期', dataIndex: 'quotationDate', key: 'quotationDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
            { title: '客戶', dataIndex: ['customer', 'name'], key: 'customer' },
            { title: '工件', dataIndex: 'workpieceNames', key: 'workpieceNames', render: (v: string[]) => v?.join('、') },
            { title: '報價', dataIndex: 'chosenPrice', key: 'chosenPrice', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            { title: '毛利率', dataIndex: 'marginRatePercent', key: 'marginRatePercent', render: (v: number) => `${v.toFixed(1)}%` },
            { title: '狀態', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'final' ? 'green' : 'default'}>{v === 'final' ? '正式' : '草稿'}</Tag> },
          ]}
        />
      </Card>
    </section>
  );
}

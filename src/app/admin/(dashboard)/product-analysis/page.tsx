'use client';

import { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';

interface ProductMargin {
  workpieceName: string;
  quotedCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginRatePercent: number;
}

export default function ProductAnalysisPage() {
  const [data, setData] = useState<ProductMargin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/margin-analysis/products');
        const result = await res.json();
        if (!mounted) return;
        setData(result?.data || []);
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
  }, []);

  return (
    <section>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>產品分析</h1>
        <p style={{ color: 'rgba(0,0,0,0.45)' }}>依工件名稱彙總歷史報價，找出最賺錢與最低毛利的產品</p>
      </div>

      <Card variant="borderless">
        <Table
          rowKey="workpieceName"
          loading={loading}
          dataSource={data}
          columns={[
            { title: '工件名稱', dataIndex: 'workpieceName', key: 'workpieceName' },
            { title: '報價次數', dataIndex: 'quotedCount', key: 'quotedCount' },
            { title: '總營收', dataIndex: 'totalRevenue', key: 'totalRevenue', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            { title: '總成本', dataIndex: 'totalCost', key: 'totalCost', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            { title: '總毛利', dataIndex: 'totalMargin', key: 'totalMargin', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            {
              title: '毛利率',
              dataIndex: 'marginRatePercent',
              key: 'marginRatePercent',
              sorter: (a, b) => a.marginRatePercent - b.marginRatePercent,
              render: (v: number) => <Tag color={v < 15 ? 'red' : v < 25 ? 'orange' : 'green'}>{v.toFixed(1)}%</Tag>,
            },
          ]}
        />
      </Card>
    </section>
  );
}

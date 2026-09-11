'use client';

import { useEffect, useState } from 'react';
import { Card, Tag } from 'antd';
import PageHeader from '@/components/page-header';
import ResponsiveTable from '@/components/responsive-table';

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
      <PageHeader title="產品分析" description="依工件名稱彙總歷史報價，找出最賺錢與最低毛利的產品" />

      <Card variant="borderless">
        <ResponsiveTable<ProductMargin>
          rowKey="workpieceName"
          loading={loading}
          dataSource={data}
          emptyText="尚無報價資料可分析"
          columns={[
            { title: '工件名稱', dataIndex: 'workpieceName', key: 'workpieceName', mobilePrimary: true },
            { title: '報價次數', dataIndex: 'quotedCount', key: 'quotedCount' },
            { title: '總營收', dataIndex: 'totalRevenue', key: 'totalRevenue', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            { title: '總成本', dataIndex: 'totalCost', key: 'totalCost', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            { title: '總毛利', dataIndex: 'totalMargin', key: 'totalMargin', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
            {
              title: '毛利率',
              dataIndex: 'marginRatePercent',
              key: 'marginRatePercent',
              sorter: (a, b) => a.marginRatePercent - b.marginRatePercent,
              // 手機版放在卡片右上角，掃一眼就能挑出低毛利產品
              mobileAction: true,
              render: (v: number) => <Tag color={v < 15 ? 'red' : v < 25 ? 'orange' : 'green'}>{v.toFixed(1)}%</Tag>,
            },
          ]}
        />
      </Card>
    </section>
  );
}

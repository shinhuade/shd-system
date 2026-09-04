'use client';

import { useEffect, useState } from 'react';
import { Card, Tabs, Tag } from 'antd';
import PageHeader from '@/components/page-header';
import ResponsiveTable from '@/components/responsive-table';
import AdminGenericList from '@/components/admin-generic-list';
import customerConfig from '@/configs/admin/customer.json';
import type { AdminConfig } from '@/types/admin-config';

interface CustomerMargin {
  customerId: string;
  customerName: string;
  quotationCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginRatePercent: number;
  targetMarginRatePercent: number;
  belowTarget: boolean;
}

function CustomerMarginTable() {
  const [data, setData] = useState<CustomerMargin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/margin-analysis/customers');
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
    <Card variant="borderless">
      <ResponsiveTable<CustomerMargin>
        rowKey="customerId"
        loading={loading}
        dataSource={data}
        emptyText="尚無報價資料可分析"
        columns={[
          { title: '客戶', dataIndex: 'customerName', key: 'customerName', mobilePrimary: true },
          { title: '報價次數', dataIndex: 'quotationCount', key: 'quotationCount' },
          { title: '總營收', dataIndex: 'totalRevenue', key: 'totalRevenue', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
          { title: '總毛利', dataIndex: 'totalMargin', key: 'totalMargin', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
          {
            title: '毛利率',
            key: 'marginRatePercent',
            render: (_: unknown, row: CustomerMargin) => (
              <Tag color={row.belowTarget ? 'red' : 'green'}>
                {row.marginRatePercent.toFixed(1)}%{row.belowTarget ? `（低於標準 ${row.targetMarginRatePercent}%）` : ''}
              </Tag>
            ),
          },
        ]}
      />
    </Card>
  );
}

export default function CustomerAnalysisPage() {
  return (
    <section>
      <PageHeader title="客戶分析" description="掌握每個客戶的毛利表現，找出低於公司標準的客戶" />

      <Tabs
        items={[
          { key: 'margin', label: '毛利分析', children: <CustomerMarginTable /> },
          { key: 'customers', label: '客戶資料', children: <AdminGenericList config={customerConfig as AdminConfig} /> },
        ]}
      />
    </section>
  );
}

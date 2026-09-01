'use client';

import { useEffect, useState } from 'react';
import { Card, Radio, Skeleton, Empty } from 'antd';
import TrendLineChart, { TrendPoint } from './trend-line-chart';

type Range = 'month' | 'quarter' | 'year';

export default function CostTrendPanel({
  title,
  metric,
  valueSuffix = '',
  defaultRange = 'month',
}: {
  title: string;
  metric: string;
  valueSuffix?: string;
  defaultRange?: Range;
}) {
  const [range, setRange] = useState<Range>(defaultRange);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/dashboard/trends?metric=${metric}&range=${range}`);
        const result = await res.json();
        if (!mounted) return;
        setData(result?.data || []);
      } catch {
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [metric, range]);

  return (
    <Card
      variant="borderless"
      title={title}
      extra={
        <Radio.Group size="small" value={range} onChange={(e) => setRange(e.target.value)}>
          <Radio.Button value="month">月</Radio.Button>
          <Radio.Button value="quarter">季</Radio.Button>
          <Radio.Button value="year">年</Radio.Button>
        </Radio.Group>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : data.length === 0 ? (
        <Empty description="尚無資料" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <TrendLineChart data={data} valueSuffix={valueSuffix} />
      )}
    </Card>
  );
}

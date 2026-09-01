'use client';

import { Pie } from '@ant-design/plots';
import { Card, Empty } from 'antd';

const CATEGORY_LABELS: Record<string, string> = {
  material: '粉料成本',
  packaging: '包材成本',
  gas: '瓦斯成本',
  water: '水費',
  electricity: '電費',
  labor: '人工成本',
  fixed_other: '其他固定成本',
};

export default function CostBreakdownChart({ costByCategory }: { costByCategory: Record<string, number> }) {
  const data = Object.entries(costByCategory)
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({ type: CATEGORY_LABELS[category] || category, value }));

  return (
    <Card variant="borderless" title="本月成本結構">
      {data.length === 0 ? (
        <Empty description="本月尚未登錄成本資料" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Pie
          data={data}
          angleField="value"
          colorField="type"
          height={280}
          innerRadius={0.6}
          label={{ text: 'type', style: { fontSize: 11 } }}
          legend={{ color: { position: 'bottom' } }}
        />
      )}
    </Card>
  );
}

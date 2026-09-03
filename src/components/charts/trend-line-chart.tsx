'use client';

import { Line } from '@ant-design/plots';
import { useIsMobile } from '@/hooks/use-media-query';

export interface TrendPoint {
  period: string;
  value: number;
}

export default function TrendLineChart({ data, height, valueSuffix = '' }: { data: TrendPoint[]; height?: number; valueSuffix?: string }) {
  const isMobile = useIsMobile();
  // 手機螢幕高度有限，圖表壓低一點才不會把下方內容擠出畫面
  const chartHeight = height ?? (isMobile ? 200 : 260);

  return (
    <Line
      data={data}
      xField="period"
      yField="value"
      height={chartHeight}
      point={{ shape: 'circle', size: 3 }}
      tooltip={{
        items: [{ field: 'value', name: '數值', valueFormatter: (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}${valueSuffix}` }],
      }}
      axis={{ y: { labelFormatter: (v: number) => `${v}${valueSuffix}` } }}
    />
  );
}

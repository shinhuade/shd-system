'use client';

import { Line } from '@ant-design/plots';

export interface TrendPoint {
  period: string;
  value: number;
}

export default function TrendLineChart({ data, height = 260, valueSuffix = '' }: { data: TrendPoint[]; height?: number; valueSuffix?: string }) {
  return (
    <Line
      data={data}
      xField="period"
      yField="value"
      height={height}
      point={{ shape: 'circle', size: 3 }}
      tooltip={{
        items: [{ field: 'value', name: '數值', valueFormatter: (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}${valueSuffix}` }],
      }}
      axis={{ y: { labelFormatter: (v: number) => `${v}${valueSuffix}` } }}
    />
  );
}

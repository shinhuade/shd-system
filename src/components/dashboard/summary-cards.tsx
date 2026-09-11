'use client';

import { Card, Col, Row, Statistic, Skeleton, Tag } from 'antd';
import { resolveCostCategoryLabel } from '@/models/schemas/cost-record';

export interface DashboardSummary {
  periodMonth: string;
  revenue: number;
  totalCost: number;
  marginAmount: number;
  marginRatePercent: number;
  costByCategory: Record<string, number>;
  momCostChangePercent: number;
  yoyCostChangePercent: number;
  alerts: { red: number; orange: number; yellow: number; isStable: boolean };
}

// 類別標籤與「每月成本紀錄」共用同一份定義，新增自訂類別時不需要改這裡

function ChangeTag({ value, label }: { value: number; label: string }) {
  const isUp = value > 0;
  const color = value > 5 ? 'red' : value < -5 ? 'green' : 'default';
  return (
    <Tag color={color}>
      {label} {isUp ? '▲' : value < 0 ? '▼' : '—'} {Math.abs(value).toFixed(1)}%
    </Tag>
  );
}

export default function SummaryCards({ summary, loading }: { summary: DashboardSummary | null; loading: boolean }) {
  if (loading || !summary) {
    return (
      <Row gutter={[16, 16]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Col xs={12} sm={12} lg={6} key={i}>
            <Card variant="borderless">
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="本月營收" value={summary.revenue} precision={0} prefix="$" />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="本月總成本" value={summary.totalCost} precision={0} prefix="$" />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ChangeTag value={summary.momCostChangePercent} label="較上月" />
              <ChangeTag value={summary.yoyCostChangePercent} label="較去年同期" />
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="本月毛利" value={summary.marginAmount} precision={0} prefix="$" />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card variant="borderless">
            <Statistic title="本月毛利率" value={summary.marginRatePercent} precision={1} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {Object.entries(summary.costByCategory).map(([category, amount]) => (
          <Col xs={12} sm={8} lg={6} key={category}>
            <Card variant="borderless" size="small">
              <Statistic
                title={resolveCostCategoryLabel(category)}
                value={amount}
                precision={0}
                prefix="$"
                styles={{ content: { fontSize: 18 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

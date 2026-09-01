'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Skeleton, Statistic } from 'antd';

const METRICS = [
  { key: 'material_cost', label: '粉料成本' },
  { key: 'packaging_cost', label: '包材成本' },
  { key: 'gas', label: '瓦斯成本' },
  { key: 'water', label: '水費' },
  { key: 'electricity', label: '電費' },
  { key: 'labor', label: '人工成本' },
  { key: 'fixed_cost', label: '固定成本' },
];

interface YearlyComparison {
  label: string;
  thisYear: number;
  lastYear: number;
  changePercent: number | null;
}

export default function AnnualReportPage() {
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState<YearlyComparison[]>([]);
  const [marginRateComparison, setMarginRateComparison] = useState<YearlyComparison | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const thisYear = new Date().getFullYear();

        const results = await Promise.all(
          METRICS.map(async (metric) => {
            const res = await fetch(`/api/admin/dashboard/trends?metric=${metric.key}&range=year`);
            const result = await res.json();
            const points: { period: string; value: number }[] = result?.data || [];
            const thisYearPoint = points.find((p) => p.period === String(thisYear));
            const lastYearPoint = points.find((p) => p.period === String(thisYear - 1));
            const thisYearValue = thisYearPoint?.value || 0;
            const lastYearValue = lastYearPoint?.value || 0;
            return {
              label: metric.label,
              thisYear: thisYearValue,
              lastYear: lastYearValue,
              changePercent: lastYearValue > 0 ? ((thisYearValue - lastYearValue) / lastYearValue) * 100 : null,
            };
          }),
        );

        const marginRes = await fetch('/api/admin/dashboard/trends?metric=margin_rate&range=year');
        const marginResult = await marginRes.json();
        const marginPoints: { period: string; value: number }[] = marginResult?.data || [];
        const marginThisYear = marginPoints.find((p) => p.period === String(thisYear))?.value || 0;
        const marginLastYear = marginPoints.find((p) => p.period === String(thisYear - 1))?.value || 0;

        if (!mounted) return;
        setComparisons(results);
        setMarginRateComparison({
          label: '毛利率',
          thisYear: marginThisYear,
          lastYear: marginLastYear,
          changePercent: marginLastYear > 0 ? ((marginThisYear - marginLastYear) / marginLastYear) * 100 : null,
        });
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

  const overallCostChange = comparisons.length
    ? comparisons.reduce((sum, c) => sum + (c.changePercent ?? 0), 0) / comparisons.filter((c) => c.changePercent !== null).length
    : null;

  return (
    <section>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>年度報表</h1>
        <p style={{ color: 'rgba(0,0,0,0.45)' }}>{new Date().getFullYear()} 年度成本與去年同期比較</p>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          {overallCostChange !== null && (
            <Alert
              style={{ marginBottom: 16 }}
              type={overallCostChange > 10 ? 'warning' : 'info'}
              showIcon
              message={`目前整體成本較去年平均增加 ${overallCostChange.toFixed(1)}%${overallCostChange > 10 ? '，建議重新檢視部分低毛利產品報價' : ''}`}
            />
          )}

          <Row gutter={[16, 16]}>
            {[...comparisons, ...(marginRateComparison ? [marginRateComparison] : [])].map((c) => (
              <Col xs={12} sm={8} lg={6} key={c.label}>
                <Card variant="borderless">
                  <Statistic
                    title={c.label}
                    value={c.thisYear}
                    precision={c.label === '毛利率' ? 1 : 0}
                    prefix={c.label === '毛利率' ? undefined : '$'}
                    suffix={c.label === '毛利率' ? '%' : undefined}
                  />
                  {c.changePercent !== null && (
                    <div style={{ marginTop: 4, fontSize: 12, color: c.changePercent > 0 ? '#cf1322' : '#3f8600' }}>
                      較去年 {c.changePercent >= 0 ? '↑' : '↓'} {Math.abs(c.changePercent).toFixed(1)}%
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </section>
  );
}

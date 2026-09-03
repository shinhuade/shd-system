'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Col, DatePicker, Row, Statistic, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import ResponsiveTable from '@/components/responsive-table';
import type { CostModel, CostModelCategory } from '@/lib/pricing/cost-model';

/**
 * 成本模型檢視：把「每月成本紀錄 ÷ 每月生產才數」的結果攤開來給管理者確認，
 * 精算報價使用的就是這裡顯示的每才成本。
 */
export default function CostModelPanel() {
  const [month, setMonth] = useState<Dayjs | null>(null);
  const [model, setModel] = useState<CostModel | null>(null);
  const [isLatest, setIsLatest] = useState(true);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const periodMonth = month?.format('YYYY-MM');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const query = periodMonth ? `?periodMonth=${periodMonth}` : '';
        const res = await fetch(`/api/admin/cost-model/current${query}`);
        const result = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setModel(null);
          setError(result?.message || '無法取得成本模型');
          return;
        }
        setModel(result.data.model);
        setIsLatest(result.data.isLatest);
        setError(undefined);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '無法取得成本模型');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [periodMonth]);

  return (
    <>
      <Card
        variant="borderless"
        loading={loading}
        style={{ marginBottom: 16 }}
        title={
          <DatePicker
            picker="month"
            placeholder="自動使用最新月份"
            value={month}
            onChange={setMonth}
          />
        }
        extra={model && isLatest && !periodMonth ? <Tag color="green">精算報價使用中</Tag> : null}
      >
        <p style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
          每才基本成本 = 當月基本成本 ÷ 當月實際生產才數。粉體成本不在這裡，精算報價時會依工件面積、膜厚與粉體單價逐件計算。
        </p>

        {error && <Alert type="warning" showIcon message={error} />}

        {model && (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={12} lg={6}>
                <Statistic title="資料月份" value={model.periodMonth} />
              </Col>
              <Col xs={12} lg={6}>
                <Statistic title="當月基本成本" value={model.baseCostTotal} precision={0} prefix="$" />
              </Col>
              <Col xs={12} lg={6}>
                <Statistic title="當月生產才數" value={model.producedCai} precision={0} suffix="才" />
              </Col>
              <Col xs={12} lg={6}>
                <Statistic title="每才基本成本" value={model.baseCostPerCai} precision={2} prefix="$" />
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {model.groups.map((group) => (
                <Col xs={8} key={group.group}>
                  <Card size="small" variant="borderless" style={{ background: '#fafafa' }}>
                    <Statistic
                      title={`每才${group.label}`}
                      value={group.perCai}
                      precision={2}
                      prefix="$"
                      styles={{ content: { fontSize: 18 } }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Card>

      {model && (
        <Card variant="borderless" title="成本明細">
          <ResponsiveTable<CostModelCategory>
            rowKey="category"
            size="small"
            pagination={false}
            dataSource={model.categories}
            emptyText="當月沒有基本成本資料"
            columns={[
              { title: '成本項目', dataIndex: 'label', key: 'label', mobilePrimary: true },
              {
                title: '分類',
                dataIndex: 'group',
                key: 'group',
                render: (_: unknown, row) =>
                  row.group === 'labor' ? <Tag color="blue">人工</Tag> : row.group === 'energy' ? <Tag color="gold">能源</Tag> : <Tag>固定</Tag>,
              },
              {
                title: '當月金額',
                dataIndex: 'amount',
                key: 'amount',
                render: (v: number) => `$${Math.round(v).toLocaleString()}`,
              },
              {
                title: '每才成本',
                dataIndex: 'perCai',
                key: 'perCai',
                render: (v: number) => `$${v.toFixed(2)}`,
              },
            ]}
          />
        </Card>
      )}
    </>
  );
}

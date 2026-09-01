'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, Row, Statistic, Tag } from 'antd';
import { Plus, ArrowLeft } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';

interface PackagingItem {
  _id: string;
  packagingCode: string;
  name: string;
  unit: string;
  currentUnitPrice: number;
}

export default function PackagingDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [packaging, setPackaging] = useState<PackagingItem | null>(null);
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemRes, historyRes] = await Promise.all([
        fetch(`/api/admin/packaging/${id}`),
        fetch(`/api/admin/packaging/${id}/price-history`),
      ]);
      const itemResult = await itemRes.json();
      const historyResult = await historyRes.json();
      setPackaging(itemResult?.data || null);
      setHistory(historyResult?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const [itemRes, historyRes] = await Promise.all([
          fetch(`/api/admin/packaging/${id}`),
          fetch(`/api/admin/packaging/${id}/price-history`),
        ]);
        const itemResult = await itemRes.json();
        const historyResult = await historyRes.json();
        if (!mounted) return;
        setPackaging(itemResult?.data || null);
        setHistory(historyResult?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [id]);

  const onAddVersion = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/packaging/${id}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '新增失敗');
      message.success('已新增價格版本');
      setModalOpen(false);
      load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const previous = history[1];
  const latestChangePercent =
    previous && packaging ? ((packaging.currentUnitPrice - (previous.unitPrice as number)) / (previous.unitPrice as number)) * 100 : null;

  return (
    <section>
      <Button type="text" icon={<ArrowLeft size={14} />} onClick={() => router.push('/admin/packaging')} style={{ marginBottom: 12, paddingLeft: 0 }}>
        返回包材管理
      </Button>

      {packaging && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, marginBottom: 4 }}>
                {packaging.name}（{packaging.packagingCode}）
              </h1>
            </div>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
              新增價格版本
            </Button>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card variant="borderless">
                <Statistic title="目前單價" value={packaging.currentUnitPrice} precision={2} prefix="$" suffix={`/ ${packaging.unit}`} />
                {latestChangePercent !== null && (
                  <Tag color={latestChangePercent > 0 ? 'red' : latestChangePercent < 0 ? 'green' : 'default'} style={{ marginTop: 8 }}>
                    較上次 {latestChangePercent >= 0 ? '+' : ''}
                    {latestChangePercent.toFixed(1)}%
                  </Tag>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card variant="borderless" title="價格趨勢">
                <TrendLineChart
                  data={[...history]
                    .reverse()
                    .map((h) => ({ period: String(h.effectiveDate).slice(0, 10), value: h.unitPrice as number }))}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card variant="borderless" title="歷史價格">
                <PriceHistoryTable history={history} valueField="unitPrice" valueLabel="單價" loading={loading} />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <AddVersionModal
        open={modalOpen}
        title="新增包材價格版本"
        submitting={submitting}
        onCancel={() => setModalOpen(false)}
        onSubmit={onAddVersion}
        fields={[{ name: 'unitPrice', label: '包材單價', type: 'number', required: true }]}
      />
    </section>
  );
}

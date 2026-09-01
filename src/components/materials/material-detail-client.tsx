'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, Row, Statistic, Tag } from 'antd';
import { Plus, ArrowLeft } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';

interface Material {
  _id: string;
  materialCode: string;
  colorName: string;
  supplierName?: string;
  unit: string;
  currentPricePerKg: number;
  currentLossRatePercent?: number | null;
}

export default function MaterialDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [material, setMaterial] = useState<Material | null>(null);
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [materialRes, historyRes] = await Promise.all([
        fetch(`/api/admin/materials/${id}`),
        fetch(`/api/admin/materials/${id}/price-history`),
      ]);
      const materialResult = await materialRes.json();
      const historyResult = await historyRes.json();
      setMaterial(materialResult?.data || null);
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
        const [materialRes, historyRes] = await Promise.all([
          fetch(`/api/admin/materials/${id}`),
          fetch(`/api/admin/materials/${id}/price-history`),
        ]);
        const materialResult = await materialRes.json();
        const historyResult = await historyRes.json();
        if (!mounted) return;
        setMaterial(materialResult?.data || null);
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
      const res = await fetch(`/api/admin/materials/${id}/price-history`, {
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
    previous && material ? ((material.currentPricePerKg - (previous.pricePerKg as number)) / (previous.pricePerKg as number)) * 100 : null;

  return (
    <section>
      <Button type="text" icon={<ArrowLeft size={14} />} onClick={() => router.push('/admin/materials')} style={{ marginBottom: 12, paddingLeft: 0 }}>
        返回粉料管理
      </Button>

      {material && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, marginBottom: 4 }}>
                {material.colorName}（{material.materialCode}）
              </h1>
              <p style={{ color: 'rgba(0,0,0,0.45)' }}>{material.supplierName || '未設定廠商'}</p>
            </div>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
              新增價格版本
            </Button>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card variant="borderless">
                <Statistic title="目前單價" value={material.currentPricePerKg} precision={2} prefix="$" suffix={`/ ${material.unit}`} />
                {latestChangePercent !== null && (
                  <Tag color={latestChangePercent > 0 ? 'red' : latestChangePercent < 0 ? 'green' : 'default'} style={{ marginTop: 8 }}>
                    較上次 {latestChangePercent >= 0 ? '+' : ''}
                    {latestChangePercent.toFixed(1)}%
                  </Tag>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless">
                <Statistic
                  title="目前損耗率"
                  value={material.currentLossRatePercent ?? '使用系統預設'}
                  suffix={material.currentLossRatePercent != null ? '%' : ''}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card variant="borderless" title="價格趨勢">
                <TrendLineChart
                  data={[...history]
                    .reverse()
                    .map((h) => ({ period: String(h.effectiveDate).slice(0, 10), value: h.pricePerKg as number }))}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card variant="borderless" title="歷史價格">
                <PriceHistoryTable history={history} valueField="pricePerKg" valueLabel="單價" loading={loading} />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <AddVersionModal
        open={modalOpen}
        title="新增粉料價格版本"
        submitting={submitting}
        onCancel={() => setModalOpen(false)}
        onSubmit={onAddVersion}
        fields={[
          { name: 'pricePerKg', label: '粉料單價 (元/kg)', type: 'number', required: true },
          { name: 'lossRatePercent', label: '損耗率 (%，留空則使用系統預設)', type: 'percent' },
        ]}
      />
    </section>
  );
}

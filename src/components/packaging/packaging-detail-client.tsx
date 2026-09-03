'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Switch, Tag } from 'antd';
import { Plus, ArrowLeft, Pen } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';
import { PACKAGING_TYPES, PACKAGING_TYPE_LABELS } from '@/models/schemas/packaging';

interface PackagingItem {
  _id: string;
  packagingCode: string;
  name: string;
  type: string;
  unit: string;
  currentUnitPrice: number;
  isActive: boolean;
}

export default function PackagingDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [packaging, setPackaging] = useState<PackagingItem | null>(null);
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState<PriceHistoryRow | null>(null);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [infoForm] = Form.useForm();

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
    (async () => {
      await load();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitVersion = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const url = editingHistory
        ? `/api/admin/packaging/${id}/price-history/${editingHistory._id}`
        : `/api/admin/packaging/${id}/price-history`;
      const res = await fetch(url, {
        method: editingHistory ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || (editingHistory ? '更新失敗' : '新增失敗'));
      message.success(editingHistory ? '已更新價格版本' : '已新增價格版本');
      setVersionModalOpen(false);
      setEditingHistory(null);
      load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteVersion = async (row: PriceHistoryRow) => {
    try {
      const res = await fetch(`/api/admin/packaging/${id}/price-history/${row._id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除該筆歷史版本');
      load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  const openEditInfo = () => {
    if (!packaging) return;
    infoForm.setFieldsValue(packaging);
    setEditInfoOpen(true);
  };

  const onSubmitInfo = async () => {
    try {
      const values = await infoForm.validateFields();
      setSubmitting(true);
      const res = await fetch(`/api/admin/packaging/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '更新失敗');
      message.success('已更新基本資料');
      setEditInfoOpen(false);
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
              <Tag>{PACKAGING_TYPE_LABELS[packaging.type as keyof typeof PACKAGING_TYPE_LABELS] || packaging.type}</Tag>
            </div>
            <Space.Compact>
              <Button icon={<Pen size={14} />} onClick={openEditInfo}>
                編輯基本資料
              </Button>
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  setEditingHistory(null);
                  setVersionModalOpen(true);
                }}
              >
                新增價格版本
              </Button>
            </Space.Compact>
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
            <Col xs={24} sm={8}>
              <Card variant="borderless">
                <Statistic title="狀態" value={packaging.isActive ? '啟用中' : '停用'} />
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
                <PriceHistoryTable
                  history={history}
                  valueField="unitPrice"
                  valueLabel="單價"
                  loading={loading}
                  onEdit={(row) => {
                    setEditingHistory(row);
                    setVersionModalOpen(true);
                  }}
                  onDelete={onDeleteVersion}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      <AddVersionModal
        open={versionModalOpen}
        title={editingHistory ? '編輯包材價格版本' : '新增包材價格版本'}
        submitting={submitting}
        onCancel={() => {
          setVersionModalOpen(false);
          setEditingHistory(null);
        }}
        onSubmit={onSubmitVersion}
        initialValues={editingHistory || undefined}
        fields={[{ name: 'unitPrice', label: '包材單價', type: 'number', required: true }]}
      />

      <Modal open={editInfoOpen} title="編輯包材基本資料" onCancel={() => setEditInfoOpen(false)} onOk={onSubmitInfo} confirmLoading={submitting}>
        <Form form={infoForm} layout="vertical">
          <Form.Item name="packagingCode" label="包材編號" rules={[{ required: true, message: '請輸入包材編號' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="包材名稱" rules={[{ required: true, message: '請輸入包材名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="類型">
            <Select options={PACKAGING_TYPES.map((value) => ({ value, label: PACKAGING_TYPE_LABELS[value] }))} />
          </Form.Item>
          <Form.Item name="unit" label="計價單位">
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="啟用中" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}

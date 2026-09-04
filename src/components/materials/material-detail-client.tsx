'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, Form, Input, Modal, Row, Select, Statistic, Switch, Tag } from 'antd';
import { Plus, ArrowLeft, Pen } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';
import PageHeader from '@/components/page-header';
import { COLOR_FAMILY_OPTIONS } from '@/models/schemas/material';

interface Material {
  _id: string;
  materialCode: string;
  colorName: string;
  colorFamily?: string;
  colorHex?: string;
  supplierName?: string;
  supplierContact?: string;
  unit: string;
  currentPricePerKg: number;
  currentLossRatePercent?: number | null;
  isActive: boolean;
}

export default function MaterialDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [material, setMaterial] = useState<Material | null>(null);
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
        ? `/api/admin/materials/${id}/price-history/${editingHistory._id}`
        : `/api/admin/materials/${id}/price-history`;
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
      const res = await fetch(`/api/admin/materials/${id}/price-history/${row._id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除該筆歷史版本');
      load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  const openEditInfo = () => {
    if (!material) return;
    infoForm.setFieldsValue(material);
    setEditInfoOpen(true);
  };

  const onSubmitInfo = async () => {
    try {
      const values = await infoForm.validateFields();
      setSubmitting(true);
      const res = await fetch(`/api/admin/materials/${id}`, {
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
    previous && material ? ((material.currentPricePerKg - (previous.pricePerKg as number)) / (previous.pricePerKg as number)) * 100 : null;

  return (
    <section>
      <Button type="text" icon={<ArrowLeft size={14} />} onClick={() => router.push('/admin/materials')} style={{ marginBottom: 12, paddingLeft: 0 }}>
        返回粉料管理
      </Button>

      {material && (
        <>
          <PageHeader
            title={`${material.colorName}（${material.materialCode}）`}
            description={
              <>
                {material.supplierName || '未設定廠商'}
                {material.colorFamily && <Tag style={{ marginLeft: 8 }}>{material.colorFamily}</Tag>}
              </>
            }
            extra={
              <>
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
              </>
            }
          />

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
            <Col xs={12} sm={8}>
              <Card variant="borderless">
                <Statistic
                  title="目前損耗率"
                  value={material.currentLossRatePercent ?? '使用系統預設'}
                  suffix={material.currentLossRatePercent != null ? '%' : ''}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card variant="borderless">
                <Statistic title="狀態" value={material.isActive ? '啟用中' : '停用'} />
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
                <PriceHistoryTable
                  history={history}
                  valueField="pricePerKg"
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
        title={editingHistory ? '編輯粉料價格版本' : '新增粉料價格版本'}
        submitting={submitting}
        onCancel={() => {
          setVersionModalOpen(false);
          setEditingHistory(null);
        }}
        onSubmit={onSubmitVersion}
        initialValues={editingHistory || undefined}
        fields={[
          { name: 'pricePerKg', label: '粉料單價 (元/kg)', type: 'number', required: true },
          { name: 'lossRatePercent', label: '損耗率 (%，留空則使用系統預設)', type: 'percent' },
        ]}
      />

      <Modal open={editInfoOpen} title="編輯粉料基本資料" onCancel={() => setEditInfoOpen(false)} onOk={onSubmitInfo} confirmLoading={submitting}>
        <Form form={infoForm} layout="vertical">
          <Form.Item name="materialCode" label="粉料編號" rules={[{ required: true, message: '請輸入粉料編號' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="colorName" label="粉料顏色" rules={[{ required: true, message: '請輸入粉料顏色' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="colorFamily" label="色系（選填）">
            <Select allowClear options={COLOR_FAMILY_OPTIONS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="colorHex" label="色票色碼（選填）">
            <Input placeholder="#RRGGBB" />
          </Form.Item>
          <Form.Item name="supplierName" label="廠商">
            <Input />
          </Form.Item>
          <Form.Item name="supplierContact" label="廠商聯絡方式">
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

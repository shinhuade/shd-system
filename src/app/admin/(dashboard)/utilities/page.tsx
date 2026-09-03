'use client';

import { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { App, Button, Card, Col, Form, Input, Modal, Row, Statistic, Tabs } from 'antd';
import { Plus, Pen } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';
import PageHeader from '@/components/page-header';

const UTILITY_TYPES = [
  { value: 'gas', label: '瓦斯' },
  { value: 'water', label: '水費' },
  { value: 'electricity', label: '電費' },
];

interface UtilityRate {
  _id: string;
  type: string;
  unitLabel: string;
  currentUnitPrice: number;
}

export default function UtilitiesPage() {
  const { message } = App.useApp();
  const [rates, setRates] = useState<UtilityRate[]>([]);
  const [activeType, setActiveType] = useState('gas');
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingHistoryRow, setEditingHistoryRow] = useState<PriceHistoryRow | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/utility-rates');
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || '讀取水電瓦斯資料失敗');
      setRates(result?.data || []);
    } catch (err) {
      console.error(err);
      message.error(err instanceof Error ? err.message : '讀取水電瓦斯資料失敗，請重新整理再試');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadRates();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = rates.find((r) => r.type === activeType);

  const loadHistory = useCallback(async () => {
    if (!current) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/utility-rates/${current._id}/price-history`);
      const result = await res.json();
      setHistory(result?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [current]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!current) {
        setHistory([]);
        return;
      }
      try {
        setHistoryLoading(true);
        const res = await fetch(`/api/admin/utility-rates/${current._id}/price-history`);
        const result = await res.json();
        if (!mounted) return;
        setHistory(result?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?._id]);

  const onCreateBase = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      const res = await fetch('/api/admin/utility-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, unitLabel: values.unitLabel }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '建立失敗');
      message.success('已建立，請接著設定單價');
      setCreateModalOpen(false);
      createForm.resetFields();
      await loadRates();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onEditInfo = async () => {
    if (!current) return;
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);
      const res = await fetch(`/api/admin/utility-rates/${current._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '更新失敗');
      message.success('已更新');
      setEditInfoOpen(false);
      await loadRates();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitVersion = async (values: Record<string, unknown>) => {
    if (!current) return;
    setSubmitting(true);
    try {
      const url = editingHistoryRow
        ? `/api/admin/utility-rates/${current._id}/price-history/${editingHistoryRow._id}`
        : `/api/admin/utility-rates/${current._id}/price-history`;
      const res = await fetch(url, {
        method: editingHistoryRow ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || (editingHistoryRow ? '更新失敗' : '新增失敗'));
      message.success(editingHistoryRow ? '已更新價格版本' : '已新增價格版本');
      setVersionModalOpen(false);
      setEditingHistoryRow(null);
      await Promise.all([loadRates(), loadHistory()]);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteVersion = async (row: PriceHistoryRow) => {
    if (!current) return;
    try {
      const res = await fetch(`/api/admin/utility-rates/${current._id}/price-history/${row._id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除該筆歷史版本');
      await Promise.all([loadRates(), loadHistory()]);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  return (
    <section>
      <PageHeader title="水電瓦斯" description="維護瓦斯、水、電的單位牌價，供成本趨勢圖與加工成本參數參考" />

      <Tabs
        activeKey={activeType}
        onChange={setActiveType}
        items={UTILITY_TYPES.map((t) => ({ key: t.value, label: t.label }))}
      />

      <Card variant="borderless" loading={loading}>
        {!current ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ marginBottom: 16, color: 'rgba(0,0,0,0.45)' }}>尚未建立「{UTILITY_TYPES.find((t) => t.value === activeType)?.label}」的牌價資料</p>
            <Button type="primary" icon={<Plus size={14} />} onClick={() => setCreateModalOpen(true)}>
              建立
            </Button>
          </div>
        ) : (
          <>
            <CurrentPriceRow>
              <Statistic title="目前單價" value={current.currentUnitPrice} precision={2} prefix="$" suffix={`/ ${current.unitLabel}`} />
              <div className="actions">
                <Button
                  icon={<Pen size={14} />}
                  onClick={() => {
                    editForm.setFieldsValue(current);
                    setEditInfoOpen(true);
                  }}
                >
                  編輯計價單位
                </Button>
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    setEditingHistoryRow(null);
                    setVersionModalOpen(true);
                  }}
                >
                  新增價格版本
                </Button>
              </div>
            </CurrentPriceRow>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card variant="borderless" size="small" title="價格趨勢">
                  <TrendLineChart data={[...history].reverse().map((h) => ({ period: String(h.effectiveDate).slice(0, 10), value: h.unitPrice as number }))} />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card variant="borderless" size="small" title="歷史價格">
                  <PriceHistoryTable
                    history={history}
                    valueField="unitPrice"
                    valueLabel="單價"
                    loading={historyLoading}
                    onEdit={(row) => {
                      setEditingHistoryRow(row);
                      setVersionModalOpen(true);
                    }}
                    onDelete={onDeleteVersion}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Card>

      <Modal open={createModalOpen} title="建立牌價項目" onCancel={() => setCreateModalOpen(false)} onOk={onCreateBase} confirmLoading={submitting}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="unitLabel" label="計價單位" rules={[{ required: true, message: '請輸入計價單位，例如：度、噸' }]}>
            <Input placeholder="例如：度、噸、kg" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={editInfoOpen} title="編輯計價單位" onCancel={() => setEditInfoOpen(false)} onOk={onEditInfo} confirmLoading={submitting}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="unitLabel" label="計價單位" rules={[{ required: true, message: '請輸入計價單位' }]}>
            <Input placeholder="例如：度、噸、kg" />
          </Form.Item>
        </Form>
      </Modal>

      <AddVersionModal
        open={versionModalOpen}
        title={editingHistoryRow ? '編輯價格版本' : '新增價格版本'}
        submitting={submitting}
        onCancel={() => {
          setVersionModalOpen(false);
          setEditingHistoryRow(null);
        }}
        onSubmit={onSubmitVersion}
        initialValues={editingHistoryRow || undefined}
        fields={[{ name: 'unitPrice', label: `單價 (元/${current?.unitLabel ?? ''})`, type: 'number', required: true }]}
      />
    </section>
  );
}

const CurrentPriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;

  .actions {
    display: flex;
    gap: 8px;
  }

  /* 手機上兩顆操作鈕各占一半，維持足夠的點按面積 */
  @media (max-width: 768px) {
    .actions {
      width: 100%;

      .ant-btn {
        flex: 1;
      }
    }
  }
`;

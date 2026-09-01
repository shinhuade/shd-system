'use client';

import { useEffect, useState, useCallback } from 'react';
import { App, Button, Form, Input, Modal, Select, Table } from 'antd';
import { Plus } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal, { VersionField } from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';

export interface CreateField {
  name: string;
  label: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
}

export interface RateItem {
  _id: string;
  [key: string]: unknown;
}

export default function RateListPanel({
  basePath,
  nameField,
  nameLabel,
  valueField,
  valueLabel,
  versionValueField,
  unitSuffix = '',
  createFields,
}: {
  basePath: string;
  nameField: string;
  nameLabel: string;
  valueField: string;
  valueLabel: string;
  versionValueField: string;
  unitSuffix?: string;
  createFields: CreateField[];
}) {
  const { message } = App.useApp();
  const [items, setItems] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, PriceHistoryRow[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [versionModalTarget, setVersionModalTarget] = useState<RateItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(basePath);
      const result = await res.json();
      setItems(result?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const res = await fetch(basePath);
        const result = await res.json();
        if (!mounted) return;
        setItems(result?.data || []);
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
  }, [basePath]);

  const loadHistoryFor = async (id: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${basePath}/${id}/price-history`);
      const result = await res.json();
      setHistory((prev) => ({ ...prev, [id]: result?.data || [] }));
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onExpand = (expanded: boolean, record: RateItem) => {
    const id = record._id;
    setExpandedId(expanded ? id : null);
    if (expanded && !history[id]) loadHistoryFor(id);
  };

  const onCreateBase = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      const res = await fetch(basePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '建立失敗');
      message.success('已建立，請接著設定金額');
      setCreateModalOpen(false);
      createForm.resetFields();
      await load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onAddVersion = async (values: Record<string, unknown>) => {
    if (!versionModalTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${basePath}/${versionModalTarget._id}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '新增失敗');
      message.success('已新增版本');
      setVersionModalTarget(null);
      await Promise.all([load(), loadHistoryFor(versionModalTarget._id)]);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const versionFields: VersionField[] = [{ name: versionValueField, label: `${valueLabel}${unitSuffix}`, type: 'number', required: true }];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<Plus size={14} />} onClick={() => setCreateModalOpen(true)}>
          新增項目
        </Button>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={items}
        expandable={{
          expandedRowKeys: expandedId ? [expandedId] : [],
          onExpand,
          expandedRowRender: (record) => (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <TrendLineChart
                data={[...(history[record._id] || [])].reverse().map((h) => ({ period: String(h.effectiveDate).slice(0, 10), value: h[versionValueField] as number }))}
              />
              <PriceHistoryTable history={history[record._id] || []} valueField={versionValueField} valueLabel={valueLabel} loading={historyLoading} />
            </div>
          ),
        }}
        columns={[
          { title: nameLabel, dataIndex: nameField, key: nameField },
          {
            title: valueLabel,
            dataIndex: valueField,
            key: valueField,
            render: (v: number) => `$${(v ?? 0).toLocaleString()}${unitSuffix}`,
          },
          {
            title: '操作',
            key: 'action',
            render: (_: unknown, record: RateItem) => (
              <Button size="small" onClick={() => setVersionModalTarget(record)}>
                新增版本
              </Button>
            ),
          },
        ]}
      />

      <Modal open={createModalOpen} title="新增項目" onCancel={() => setCreateModalOpen(false)} onOk={onCreateBase} confirmLoading={submitting}>
        <Form form={createForm} layout="vertical">
          {createFields.map((field) => (
            <Form.Item key={field.name} name={field.name} label={field.label} rules={[{ required: true, message: `請輸入${field.label}` }]}>
              {field.type === 'select' ? <Select options={field.options} /> : <Input />}
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <AddVersionModal
        open={!!versionModalTarget}
        title="新增版本"
        submitting={submitting}
        onCancel={() => setVersionModalTarget(null)}
        onSubmit={onAddVersion}
        fields={versionFields}
      />
    </>
  );
}

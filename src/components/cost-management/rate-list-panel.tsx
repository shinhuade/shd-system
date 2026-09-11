'use client';

import { useEffect, useState, useCallback } from 'react';
import { App, Button, Col, Form, Input, Modal, Popconfirm, Row, Select, Space } from 'antd';
import { Plus, Pen, Trash } from '@styled-icons/fa-solid';
import PriceHistoryTable, { PriceHistoryRow } from '@/components/versioned-resource/price-history-table';
import AddVersionModal, { VersionField } from '@/components/versioned-resource/add-version-modal';
import TrendLineChart from '@/components/charts/trend-line-chart';
import ResponsiveTable from '@/components/responsive-table';

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
  const [editBaseTarget, setEditBaseTarget] = useState<RateItem | null>(null);
  const [versionModalTarget, setVersionModalTarget] = useState<RateItem | null>(null);
  const [editingHistoryRow, setEditingHistoryRow] = useState<PriceHistoryRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(basePath);
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || '讀取資料失敗');
      setItems(result?.data || []);
    } catch (err) {
      console.error(err);
      message.error(err instanceof Error ? err.message : '讀取資料失敗，請重新整理再試');
    } finally {
      setLoading(false);
    }
  }, [basePath, message]);

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
    if (expanded) loadHistoryFor(id);
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

  const onEditBase = async () => {
    if (!editBaseTarget) return;
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);
      const res = await fetch(`${basePath}/${editBaseTarget._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '更新失敗');
      message.success('已更新');
      setEditBaseTarget(null);
      await load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteBase = async (id: string) => {
    try {
      const res = await fetch(`${basePath}/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除');
      await load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  const onSubmitVersion = async (values: Record<string, unknown>) => {
    if (!versionModalTarget) return;
    setSubmitting(true);
    try {
      const url = editingHistoryRow
        ? `${basePath}/${versionModalTarget._id}/price-history/${editingHistoryRow._id}`
        : `${basePath}/${versionModalTarget._id}/price-history`;
      const res = await fetch(url, {
        method: editingHistoryRow ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || (editingHistoryRow ? '更新失敗' : '新增失敗'));
      message.success(editingHistoryRow ? '已更新版本' : '已新增版本');
      const targetId = versionModalTarget._id;
      setVersionModalTarget(null);
      setEditingHistoryRow(null);
      await Promise.all([load(), loadHistoryFor(targetId)]);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteVersion = async (itemId: string, row: PriceHistoryRow) => {
    try {
      const res = await fetch(`${basePath}/${itemId}/price-history/${row._id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除該筆版本');
      await Promise.all([load(), loadHistoryFor(itemId)]);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
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

      <ResponsiveTable<RateItem>
        rowKey="_id"
        loading={loading}
        dataSource={items}
        emptyText="尚未建立任何項目"
        expandable={{
          expandedRowKeys: expandedId ? [expandedId] : [],
          onExpand,
          expandedRowRender: (record) => (
            /* 手機版改為上下堆疊，趨勢圖與歷史價格都能看完整 */
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
              <TrendLineChart
                data={[...(history[record._id] || [])].reverse().map((h) => ({ period: String(h.effectiveDate).slice(0, 10), value: h[versionValueField] as number }))}
              />
              </Col>
              <Col xs={24} md={12}>
                <PriceHistoryTable
                  history={history[record._id] || []}
                  valueField={versionValueField}
                  valueLabel={valueLabel}
                  loading={historyLoading}
                  onEdit={(row) => {
                    setVersionModalTarget(record);
                    setEditingHistoryRow(row);
                  }}
                  onDelete={(row) => onDeleteVersion(record._id, row)}
                />
              </Col>
            </Row>
          ),
        }}
        columns={[
          { title: nameLabel, dataIndex: nameField, key: nameField, mobilePrimary: true },
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
              <Space size={4} wrap>
                <Button
                  size="small"
                  onClick={() => {
                    setVersionModalTarget(record);
                    setEditingHistoryRow(null);
                  }}
                >
                  新增版本
                </Button>
                <Button
                  size="small"
                  type="text"
                  icon={<Pen size={12} />}
                  onClick={() => {
                    setEditBaseTarget(record);
                    editForm.setFieldsValue(record);
                  }}
                />
                <Popconfirm title="確定要刪除這個項目嗎？（歷史版本也會一併刪除）" onConfirm={() => onDeleteBase(record._id)} okText="刪除" cancelText="取消">
                  <Button size="small" type="text" danger icon={<Trash size={12} />} />
                </Popconfirm>
              </Space>
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

      <Modal open={!!editBaseTarget} title="編輯項目" onCancel={() => setEditBaseTarget(null)} onOk={onEditBase} confirmLoading={submitting}>
        <Form form={editForm} layout="vertical">
          {createFields.map((field) => (
            <Form.Item key={field.name} name={field.name} label={field.label} rules={[{ required: true, message: `請輸入${field.label}` }]}>
              {field.type === 'select' ? <Select options={field.options} /> : <Input />}
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <AddVersionModal
        open={!!versionModalTarget}
        title={editingHistoryRow ? '編輯版本' : '新增版本'}
        submitting={submitting}
        onCancel={() => {
          setVersionModalTarget(null);
          setEditingHistoryRow(null);
        }}
        onSubmit={onSubmitVersion}
        initialValues={editingHistoryRow || undefined}
        fields={versionFields}
      />
    </>
  );
}

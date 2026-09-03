'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import { Plus, Pen, Trash } from '@styled-icons/fa-solid';

interface FormulaTemplate {
  _id: string;
  name: string;
  code: string;
  lwFaces: number;
  lhFaces: number;
  whFaces: number;
  isActive: boolean;
}

const FACE_FIELDS: { name: 'lwFaces' | 'lhFaces' | 'whFaces'; label: string }[] = [
  { name: 'lwFaces', label: '長×寬（前後）面數' },
  { name: 'lhFaces', label: '長×高（左右）面數' },
  { name: 'whFaces', label: '寬×高（上下）面數' },
];

export default function WorkpieceFormulaPanel() {
  const { message } = App.useApp();
  const [items, setItems] = useState<FormulaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalTarget, setModalTarget] = useState<FormulaTemplate | 'new' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/workpiece-formula-templates');
        const result = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(result?.message || '讀取範本失敗');
        setItems(result?.data || []);
      } catch (err) {
        console.error(err);
        if (mounted) message.error(err instanceof Error ? err.message : '讀取範本失敗，請重新整理再試');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [message]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workpiece-formula-templates');
      const result = await res.json();
      setItems(result?.data || []);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ lwFaces: 2, lhFaces: 2, whFaces: 2, isActive: true });
    setModalTarget('new');
  };

  const openEdit = (record: FormulaTemplate) => {
    form.setFieldsValue(record);
    setModalTarget(record);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const isNew = modalTarget === 'new';
      const url = isNew ? '/api/admin/workpiece-formula-templates' : `/api/admin/workpiece-formula-templates/${(modalTarget as FormulaTemplate)._id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '儲存失敗');
      message.success(isNew ? '已建立範本' : '已更新範本');
      setModalTarget(null);
      await reload();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/workpiece-formula-templates/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除');
      await reload();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  return (
    <>
      <p style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 12 }}>
        面數公式：長×寬（前後）/長×高（左右）/寬×高（上下）三個方向各自需要計價的面數（0~2），組成公式代碼（例如
        222 完整箱體、221 無蓋箱體、112 洞洞板類）。修改或刪除範本不會影響已建立的報價，因為每筆報價都會保留當下的面數快照。
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<Plus size={14} />} onClick={openCreate}>
          新增範本
        </Button>
      </div>

      <Card variant="borderless">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={items}
          columns={[
            { title: '公式', dataIndex: 'code', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '名稱', dataIndex: 'name', key: 'name' },
            { title: '長×寬（前後）', dataIndex: 'lwFaces', key: 'lwFaces', render: (v: number) => `${v} 面` },
            { title: '長×高（左右）', dataIndex: 'lhFaces', key: 'lhFaces', render: (v: number) => `${v} 面` },
            { title: '寬×高（上下）', dataIndex: 'whFaces', key: 'whFaces', render: (v: number) => `${v} 面` },
            { title: '狀態', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用中' : '停用'}</Tag> },
            {
              title: '操作',
              key: 'action',
              render: (_: unknown, record: FormulaTemplate) => (
                <Space size={4}>
                  <Button size="small" type="text" icon={<Pen size={12} />} onClick={() => openEdit(record)} />
                  <Popconfirm title="確定要刪除這個範本嗎？" onConfirm={() => onDelete(record._id)} okText="刪除" cancelText="取消">
                    <Button size="small" type="text" danger icon={<Trash size={12} />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!modalTarget}
        title={modalTarget === 'new' ? '新增面數公式範本' : '編輯面數公式範本'}
        onCancel={() => setModalTarget(null)}
        onOk={onSubmit}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="範本名稱" rules={[{ required: true, message: '請輸入範本名稱' }]}>
            <Input placeholder="例如：完整箱體" />
          </Form.Item>
          {FACE_FIELDS.map((field) => (
            <Form.Item key={field.name} name={field.name} label={field.label} rules={[{ required: true, message: `請輸入${field.label}` }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={2} />
            </Form.Item>
          ))}
          <Form.Item name="isActive" label="啟用中" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

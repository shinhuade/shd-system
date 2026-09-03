'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Switch, Table, Tag } from 'antd';
import { Plus, Trash } from '@styled-icons/fa-solid';

interface PackagingItem {
  _id: string;
  packagingCode: string;
  name: string;
  type: string;
  unit: string;
  currentUnitPrice: number;
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = { box: '紙箱', pallet: '棧板', foam: '泡棉', tape: '膠帶', other: '其他' };

export default function PackagingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [form] = Form.useForm();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/packaging');
        const result = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(result?.message || '讀取包材資料失敗');
        setData(result?.data || []);
      } catch (err) {
        console.error(err);
        if (mounted) message.error(err instanceof Error ? err.message : '讀取包材資料失敗，請重新整理再試');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [reloadToken, message]);

  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch('/api/admin/packaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '建立失敗');

      message.success('已建立包材基本資料，請接著設定單價');
      setModalOpen(false);
      form.resetFields();
      router.push(`/admin/packaging/${result.data._id}`);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/packaging/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '刪除失敗');
      message.success('已刪除');
      setReloadToken((v) => v + 1);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>包材管理</h1>
          <p style={{ color: 'rgba(0,0,0,0.45)' }}>維護包材單價，所有變動都會保留歷史版本</p>
        </div>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          新增包材
        </Button>
      </div>

      <Card variant="borderless">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data}
          onRow={(record) => ({ onClick: () => router.push(`/admin/packaging/${record._id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: '編號', dataIndex: 'packagingCode', key: 'packagingCode' },
            { title: '名稱', dataIndex: 'name', key: 'name' },
            { title: '類型', dataIndex: 'type', key: 'type', render: (v: string) => TYPE_LABELS[v] || v },
            { title: '目前單價', dataIndex: 'currentUnitPrice', key: 'currentUnitPrice', render: (v: number, r) => `$${v?.toLocaleString() ?? 0} / ${r.unit}` },
            { title: '狀態', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用中' : '停用'}</Tag> },
            {
              title: '操作',
              key: 'action',
              width: 64,
              render: (_: unknown, record: PackagingItem) => (
                <Popconfirm
                  title="確定要刪除這筆包材嗎？（歷史價格也會一併刪除）"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    onDelete(record._id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="刪除"
                  cancelText="取消"
                >
                  <Button size="small" type="text" danger icon={<Trash size={12} />} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title="新增包材" onCancel={() => setModalOpen(false)} onOk={onCreate} confirmLoading={submitting}>
        <Form form={form} layout="vertical" initialValues={{ unit: '個', type: 'other', isActive: true }}>
          <Form.Item name="packagingCode" label="包材編號" rules={[{ required: true, message: '請輸入包材編號' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="包材名稱" rules={[{ required: true, message: '請輸入包材名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="類型">
            <Select
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
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

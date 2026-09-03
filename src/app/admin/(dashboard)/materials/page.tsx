'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Segmented, Select, Space, Switch, Table, Tag } from 'antd';
import { Plus, Trash } from '@styled-icons/fa-solid';
import { COLOR_FAMILY_OPTIONS } from '@/models/schemas/material';

interface Material {
  _id: string;
  materialCode: string;
  colorName: string;
  colorFamily?: string;
  colorHex?: string;
  supplierName?: string;
  unit: string;
  currentPricePerKg: number;
  currentLossRatePercent?: number | null;
  isActive: boolean;
}

type GroupBy = 'none' | 'colorFamily' | 'supplierName';

export default function MaterialsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [form] = Form.useForm();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/materials');
        const result = await res.json();
        if (!mounted) return;
        setData(result?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [reloadToken]);

  const sortedData = useMemo(() => {
    if (groupBy === 'none') return data;
    const collator = new Intl.Collator('zh-Hant');
    return [...data].sort((a, b) => {
      const groupA = (a[groupBy] as string) || '（未分類）';
      const groupB = (b[groupBy] as string) || '（未分類）';
      const groupCompare = collator.compare(groupA, groupB);
      if (groupCompare !== 0) return groupCompare;
      return collator.compare(a.colorName, b.colorName);
    });
  }, [data, groupBy]);

  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '建立失敗');

      message.success('已建立粉料基本資料，請接著設定單價');
      setModalOpen(false);
      form.resetFields();
      router.push(`/admin/materials/${result.data._id}`);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/materials/${id}`, { method: 'DELETE' });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>粉料管理</h1>
          <p style={{ color: 'rgba(0,0,0,0.45)' }}>維護粉料單價與損耗率，所有變動都會保留歷史版本</p>
        </div>
        <Button type="primary" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          新增粉料
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ color: 'rgba(0,0,0,0.45)' }}>排列整理：</span>
        <Segmented
          value={groupBy}
          onChange={(v) => setGroupBy(v as GroupBy)}
          options={[
            { label: '預設', value: 'none' },
            { label: '依色系', value: 'colorFamily' },
            { label: '依廠商', value: 'supplierName' },
          ]}
        />
      </div>

      <Card variant="borderless">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={sortedData}
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({ onClick: () => router.push(`/admin/materials/${record._id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: '編號', dataIndex: 'materialCode', key: 'materialCode', sorter: (a, b) => a.materialCode.localeCompare(b.materialCode) },
            {
              title: '顏色',
              dataIndex: 'colorName',
              key: 'colorName',
              sorter: (a, b) => a.colorName.localeCompare(b.colorName),
              render: (v: string, record) => (
                <Space>
                  {record.colorHex && <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: record.colorHex, border: '1px solid #ddd' }} />}
                  {v}
                </Space>
              ),
            },
            {
              title: '色系',
              dataIndex: 'colorFamily',
              key: 'colorFamily',
              sorter: (a, b) => (a.colorFamily || '').localeCompare(b.colorFamily || ''),
              render: (v?: string) => (v ? <Tag>{v}</Tag> : '-'),
            },
            {
              title: '廠商',
              dataIndex: 'supplierName',
              key: 'supplierName',
              sorter: (a, b) => (a.supplierName || '').localeCompare(b.supplierName || ''),
            },
            {
              title: '目前單價',
              dataIndex: 'currentPricePerKg',
              key: 'currentPricePerKg',
              sorter: (a, b) => a.currentPricePerKg - b.currentPricePerKg,
              render: (v: number, r) => `$${v?.toLocaleString() ?? 0} / ${r.unit}`,
            },
            { title: '損耗率', dataIndex: 'currentLossRatePercent', key: 'currentLossRatePercent', render: (v?: number | null) => (v == null ? '(使用預設)' : `${v}%`) },
            { title: '狀態', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用中' : '停用'}</Tag> },
            {
              title: '操作',
              key: 'action',
              width: 64,
              render: (_: unknown, record: Material) => (
                <Popconfirm
                  title="確定要刪除這筆粉料嗎？（歷史價格也會一併刪除）"
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

      <Modal open={modalOpen} title="新增粉料" onCancel={() => setModalOpen(false)} onOk={onCreate} confirmLoading={submitting}>
        <Form form={form} layout="vertical" initialValues={{ unit: 'kg', isActive: true }}>
          <Form.Item name="materialCode" label="粉料編號（英文/數字）" rules={[{ required: true, message: '請輸入粉料編號' }]}>
            <Input placeholder="例如：SP102353C" />
          </Form.Item>
          <Form.Item name="colorName" label="粉料顏色（中文）" rules={[{ required: true, message: '請輸入粉料顏色' }]}>
            <Input placeholder="例如：古銅金" />
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

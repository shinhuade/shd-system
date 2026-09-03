'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Switch, Tabs, Tag } from 'antd';
import { Plus, Trash } from '@styled-icons/fa-solid';
import { PACKAGING_TYPES, PACKAGING_TYPE_LABELS } from '@/models/schemas/packaging';
import PageHeader from '@/components/page-header';
import ResponsiveTable from '@/components/responsive-table';

interface PackagingItem {
  _id: string;
  packagingCode: string;
  name: string;
  type: string;
  unit: string;
  currentUnitPrice: number;
  isActive: boolean;
}

export default function PackagingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [data, setData] = useState<PackagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeType, setActiveType] = useState<string>('all');
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

  const filteredData = useMemo(() => {
    if (activeType === 'all') return data;
    return data.filter((item) => item.type === activeType);
  }, [data, activeType]);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of data) counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, [data]);

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
      <PageHeader
        title="包材管理"
        description="包材、藥水、紙類分開管理，維護單價所有變動都會保留歷史版本"
        extra={
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              form.setFieldsValue({ type: activeType === 'all' ? 'packaging' : activeType });
              setModalOpen(true);
            }}
          >
            新增項目
          </Button>
        }
      />

      <Tabs
        activeKey={activeType}
        onChange={setActiveType}
        /* 類別較多時可橫向滑動，不會擠成兩行 */
        tabBarGutter={12}
        items={[
          { key: 'all', label: `全部 (${data.length})` },
          ...PACKAGING_TYPES.map((t) => ({ key: t, label: `${PACKAGING_TYPE_LABELS[t]} (${countByType[t] || 0})` })),
        ]}
      />

      <Card variant="borderless">
        <ResponsiveTable<PackagingItem>
          rowKey="_id"
          loading={loading}
          dataSource={filteredData}
          onRow={(record) => ({ onClick: () => router.push(`/admin/packaging/${record._id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: '編號', dataIndex: 'packagingCode', key: 'packagingCode', mobileHidden: true },
            { title: '名稱', dataIndex: 'name', key: 'name', mobilePrimary: true, render: (v: string, r) => (
                <span>
                  {v} <MobileOnlyCode>{r.packagingCode}</MobileOnlyCode>
                </span>
              ) },
            { title: '類別', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{PACKAGING_TYPE_LABELS[v as keyof typeof PACKAGING_TYPE_LABELS] || v}</Tag> },
            { title: '目前單價', dataIndex: 'currentUnitPrice', key: 'currentUnitPrice', render: (v: number, r) => `$${v?.toLocaleString() ?? 0} / ${r.unit}` },
            { title: '狀態', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用中' : '停用'}</Tag> },
            {
              title: '操作',
              key: 'action',
              width: 64,
              render: (_: unknown, record: PackagingItem) => (
                <Popconfirm
                  title="確定要刪除這筆項目嗎？（歷史價格也會一併刪除）"
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

      <Modal open={modalOpen} title="新增項目" onCancel={() => setModalOpen(false)} onOk={onCreate} confirmLoading={submitting}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ unit: '個', type: activeType === 'all' ? 'packaging' : activeType, isActive: true }}
        >
          <Form.Item name="packagingCode" label="編號" rules={[{ required: true, message: '請輸入編號' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="名稱" rules={[{ required: true, message: '請輸入名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="類別">
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

/** 手機版卡片標題同時顯示編號（桌機表格已有獨立欄位） */
const MobileOnlyCode = styled.span`
  display: none;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  font-weight: 400;

  @media (max-width: 768px) {
    display: inline;
  }
`;

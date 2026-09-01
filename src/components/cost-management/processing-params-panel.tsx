'use client';

import { useEffect, useState, useCallback } from 'react';
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Statistic, Table } from 'antd';
import { Plus } from '@styled-icons/fa-solid';
import dayjs from 'dayjs';

const FIELDS: { name: string; label: string }[] = [
  { name: 'hourlyLaborCost', label: '每小時人工成本' },
  { name: 'hourlyGasCost', label: '每小時瓦斯成本' },
  { name: 'hourlyElectricityCost', label: '每小時電力成本' },
  { name: 'hourlyWaterCost', label: '每小時水費' },
  { name: 'hourlyEquipmentCost', label: '每小時設備成本' },
  { name: 'hourlyFactoryCost', label: '每小時廠房成本' },
  { name: 'hourlyManagementCost', label: '每小時管理成本' },
];

interface ProcessingParams {
  _id: string;
  effectiveDate: string;
  note?: string;
  [key: string]: unknown;
}

export default function ProcessingParamsPanel() {
  const { message } = App.useApp();
  const [current, setCurrent] = useState<ProcessingParams | null>(null);
  const [history, setHistory] = useState<ProcessingParams[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        fetch('/api/admin/processing-params/current'),
        fetch('/api/admin/processing-params'),
      ]);
      const currentResult = await currentRes.json();
      const historyResult = await historyRes.json();
      setCurrent(currentRes.ok ? currentResult.data : null);
      setHistory(historyResult?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const [currentRes, historyRes] = await Promise.all([
          fetch('/api/admin/processing-params/current'),
          fetch('/api/admin/processing-params'),
        ]);
        const currentResult = await currentRes.json();
        const historyResult = await historyRes.json();
        if (!mounted) return;
        setCurrent(currentRes.ok ? currentResult.data : null);
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
  }, []);

  const openModal = () => {
    form.resetFields();
    form.setFieldsValue({ effectiveDate: dayjs(), ...(current || {}) });
    setModalOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch('/api/admin/processing-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, effectiveDate: (values.effectiveDate as dayjs.Dayjs).toISOString() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '建立失敗');
      message.success('已新增加工成本參數版本');
      setModalOpen(false);
      await load();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: 'rgba(0,0,0,0.45)', margin: 0 }}>報價引擎計算加工成本時使用的每小時費率卡，每次調整都會保留完整版本</p>
        <Button type="primary" icon={<Plus size={14} />} onClick={openModal} loading={loading}>
          新增版本
        </Button>
      </div>

      {current && (
        <Card variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            {FIELDS.map((f) => (
              <Col xs={12} sm={8} lg={24 / 7} key={f.name}>
                <Statistic title={f.label} value={(current[f.name] as number) ?? 0} precision={1} prefix="$" styles={{ content: { fontSize: 16 } }} />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card variant="borderless" title="歷史版本">
        <Table
          rowKey="_id"
          size="small"
          loading={loading}
          dataSource={history}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '生效日期', dataIndex: 'effectiveDate', key: 'effectiveDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
            ...FIELDS.map((f) => ({ title: f.label, dataIndex: f.name, key: f.name, render: (v: number) => `$${(v ?? 0).toLocaleString()}` })),
            { title: '備註', dataIndex: 'note', key: 'note', ellipsis: true },
          ]}
          scroll={{ x: true }}
        />
      </Card>

      <Modal open={modalOpen} title="新增加工成本參數版本" onCancel={() => setModalOpen(false)} onOk={onSubmit} confirmLoading={submitting} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="effectiveDate" label="生效日期" rules={[{ required: true, message: '請選擇生效日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            {FIELDS.map((f) => (
              <Col span={12} key={f.name}>
                <Form.Item name={f.name} label={f.label} rules={[{ required: true, message: `請輸入${f.label}` }]}>
                  <InputNumber style={{ width: '100%' }} min={0} addonBefore="$" />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item name="note" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

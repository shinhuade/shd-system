'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Statistic, Table } from 'antd';
import PageHeader from '@/components/page-header';
import dayjs from 'dayjs';

const FIELDS: { name: string; label: string; suffix?: string; max?: number; optional?: boolean; hint?: string }[] = [
  { name: 'defaultMaterialLossRatePercent', label: '預設粉料損耗率', suffix: '%', max: 100 },
  { name: 'standardMarkupPercent', label: '標準報價加成率', suffix: '%' },
  { name: 'highMarginMarkupPercent', label: '高毛利報價加成率', suffix: '%' },
  { name: 'reQuoteAlertThresholdPercent', label: '漲價提醒門檻', suffix: '%' },
  { name: 'targetMarginRatePercent', label: '公司毛利率標準', suffix: '%', max: 100 },
  { name: 'powderUsageGramPerM2PerMicron', label: '粉料用量係數 (g/m²/μm)' },
  { name: 'transferEfficiencyPercent', label: '噴塗轉移率', suffix: '%', max: 100 },
  { name: 'standardMonthlyOperatingHours', label: '每月標準工時', suffix: '小時' },
  { name: 'standardCycleHoursPerBatch', label: '每批次標準加工工時', suffix: '小時' },
  {
    name: 'caiPerFoot',
    label: '尺才換算（1 尺 = 幾才）',
    suffix: '才',
    optional: true,
    hint: '未填寫時，快速報價的「一尺單價」不會計算。系統不會自行猜測換算基準。',
  },
];

interface SystemSettings {
  _id: string;
  effectiveDate: string;
  note?: string;
  [key: string]: unknown;
}

export default function SystemSettingsPage() {
  const { message } = App.useApp();
  const [current, setCurrent] = useState<SystemSettings | null>(null);
  const [history, setHistory] = useState<SystemSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const [currentRes, historyRes] = await Promise.all([
          fetch('/api/admin/system-settings/current'),
          fetch('/api/admin/system-settings'),
        ]);
        const currentResult = await currentRes.json();
        const historyResult = await historyRes.json();
        if (!mounted) return;
        const currentData = currentRes.ok ? currentResult.data : null;
        setCurrent(currentData);
        setHistory(historyResult?.data || []);
        if (currentData) {
          form.setFieldsValue({ ...currentData, effectiveDate: dayjs() });
        } else {
          form.setFieldsValue({ effectiveDate: dayjs() });
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, effectiveDate: (values.effectiveDate as dayjs.Dayjs).toISOString() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '儲存失敗');
      message.success('已建立系統參數新版本');

      const [currentRes, historyRes] = await Promise.all([
        fetch('/api/admin/system-settings/current'),
        fetch('/api/admin/system-settings'),
      ]);
      setCurrent(await currentRes.json().then((r) => r.data));
      setHistory(await historyRes.json().then((r) => r.data || []));
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <PageHeader
        title="系統設定"
        description="報價引擎使用的全域係數（加成率、損耗率預設值、漲價提醒門檻等），每次調整都保留版本"
      />

      {current && (
        <Card variant="borderless" style={{ marginBottom: 16 }} loading={loading}>
          <Row gutter={[16, 16]}>
            {FIELDS.map((f) => (
              <Col xs={12} sm={8} lg={24 / 5} key={f.name}>
                <Statistic
                  title={f.label}
                  value={(current[f.name] as number) ?? (f.optional ? '未設定' : 0)}
                  suffix={current[f.name] != null ? f.suffix : undefined}
                  styles={{ content: { fontSize: 16 } }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card variant="borderless" title="新增版本" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="effectiveDate" label="生效日期" rules={[{ required: true, message: '請選擇生效日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            {FIELDS.map((f) => (
              <Col xs={24} sm={12} lg={8} key={f.name}>
                <Form.Item
                  name={f.name}
                  label={f.label}
                  extra={f.hint}
                  rules={f.optional ? undefined : [{ required: true, message: `請輸入${f.label}` }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={f.max} suffix={f.suffix} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item name="note" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" block loading={submitting} onClick={onSubmit}>
            儲存新版本
          </Button>
        </Form>
      </Card>

      <Card variant="borderless" title="歷史版本">
        <Table
          rowKey="_id"
          size="small"
          loading={loading}
          dataSource={history}
          pagination={{ pageSize: 6 }}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: '生效日期', dataIndex: 'effectiveDate', key: 'effectiveDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
            ...FIELDS.map((f) => ({
              title: f.label,
              dataIndex: f.name,
              key: f.name,
              render: (v: number) => `${v ?? 0}${f.suffix || ''}`,
            })),
            { title: '備註', dataIndex: 'note', key: 'note', ellipsis: true },
          ]}
        />
      </Card>
    </section>
  );
}

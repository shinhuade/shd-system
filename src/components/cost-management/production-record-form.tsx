'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Input, InputNumber, Modal, Popconfirm, Row, Statistic } from 'antd';
import { Plus, Trash } from '@styled-icons/fa-solid';
import dayjs, { Dayjs } from 'dayjs';
import ResponsiveTable from '@/components/responsive-table';
import { computeAvgCaiPerDay, ProductionMetricInput } from '@/models/schemas/production-record';

interface ProductionRecordRow {
  _id?: string;
  periodMonth: string;
  workingDays: number;
  producedCai: number;
  avgFilmThicknessUm?: number;
  powderUsageKg?: number;
  gasUsage?: number;
  electricityUsageKwh?: number;
  waterUsage?: number;
  extraMetrics?: ProductionMetricInput[];
  note?: string;
}

const NUMBER_FIELDS: { name: keyof ProductionRecordRow; label: string; suffix?: string; required?: boolean }[] = [
  { name: 'workingDays', label: '工作天數', suffix: '天', required: true },
  { name: 'producedCai', label: '實際生產才數', suffix: '才', required: true },
  { name: 'avgFilmThicknessUm', label: '平均膜厚', suffix: 'μm' },
  { name: 'powderUsageKg', label: '噴粉量', suffix: 'kg' },
  { name: 'gasUsage', label: '瓦斯用量' },
  { name: 'electricityUsageKwh', label: '用電量', suffix: 'kWh' },
  { name: 'waterUsage', label: '用水量' },
];

const emptyRecord = (periodMonth: string): ProductionRecordRow => ({
  periodMonth,
  workingDays: 0,
  producedCai: 0,
  extraMetrics: [],
});

/**
 * 每月生產紀錄：成本模型的分母來源。
 * 每才基本成本 = 當月基本成本 ÷ 當月實際生產才數，因此這裡的資料越完整，精算報價越準。
 */
export default function ProductionRecordForm() {
  const { message } = App.useApp();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [record, setRecord] = useState<ProductionRecordRow>(emptyRecord(dayjs().format('YYYY-MM')));
  const [history, setHistory] = useState<ProductionRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [metricLabel, setMetricLabel] = useState('');
  const [metricUnit, setMetricUnit] = useState('');

  const periodMonth = month.format('YYYY-MM');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [currentRes, listRes] = await Promise.all([
          fetch(`/api/admin/production-records?periodMonth=${periodMonth}`),
          fetch('/api/admin/production-records'),
        ]);
        const [currentResult, listResult] = await Promise.all([currentRes.json(), listRes.json()]);
        if (!mounted) return;
        setRecord(currentResult?.data ? { ...emptyRecord(periodMonth), ...currentResult.data } : emptyRecord(periodMonth));
        setHistory(listResult?.data || []);
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
  }, [periodMonth, reloadToken]);

  const avgCaiPerDay = computeAvgCaiPerDay(record.producedCai || 0, record.workingDays || 0);

  const onAddMetric = () => {
    const label = metricLabel.trim();
    if (!label) {
      message.error('請輸入指標名稱');
      return;
    }
    setRecord((prev) => ({
      ...prev,
      extraMetrics: [
        ...(prev.extraMetrics || []),
        { key: `metric_${Date.now().toString(36)}`, label, value: 0, unit: metricUnit.trim() || undefined },
      ],
    }));
    setMetricLabel('');
    setMetricUnit('');
    setMetricModalOpen(false);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/production-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodMonth,
          workingDays: record.workingDays || 0,
          producedCai: record.producedCai || 0,
          avgFilmThicknessUm: record.avgFilmThicknessUm,
          powderUsageKg: record.powderUsageKg,
          gasUsage: record.gasUsage,
          electricityUsageKwh: record.electricityUsageKwh,
          waterUsage: record.waterUsage,
          extraMetrics: record.extraMetrics || [],
          note: record.note,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '儲存失敗');
      message.success(`已儲存 ${periodMonth} 的生產紀錄`);
      setReloadToken((v) => v + 1);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card
        variant="borderless"
        loading={loading}
        style={{ marginBottom: 16 }}
        title={<DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} />}
        extra={
          <Button type="primary" loading={saving} onClick={onSave}>
            儲存
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          {NUMBER_FIELDS.map((field) => (
            <Col xs={12} sm={8} lg={6} key={field.name}>
              <label style={{ display: 'block', marginBottom: 6, color: 'rgba(0,0,0,0.65)' }}>
                {field.label}
                {field.required && <span style={{ color: '#cf1322' }}> *</span>}
              </label>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                suffix={field.suffix}
                value={(record[field.name] as number | undefined) ?? undefined}
                onChange={(v) => setRecord((prev) => ({ ...prev, [field.name]: v ?? undefined }))}
              />
            </Col>
          ))}

          {(record.extraMetrics || []).map((metric, index) => (
            <Col xs={12} sm={8} lg={6} key={metric.key}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, color: 'rgba(0,0,0,0.65)' }}>
                <span>{metric.label}</span>
                <Popconfirm
                  title="移除這個生產指標？"
                  okText="移除"
                  cancelText="取消"
                  onConfirm={() =>
                    setRecord((prev) => ({
                      ...prev,
                      extraMetrics: (prev.extraMetrics || []).filter((m) => m.key !== metric.key),
                    }))
                  }
                >
                  <Button size="small" type="text" danger icon={<Trash size={12} />} />
                </Popconfirm>
              </label>
              <InputNumber
                style={{ width: '100%' }}
                suffix={metric.unit}
                value={metric.value}
                onChange={(v) =>
                  setRecord((prev) => {
                    const next = [...(prev.extraMetrics || [])];
                    next[index] = { ...next[index], value: v ?? 0 };
                    return { ...prev, extraMetrics: next };
                  })
                }
              />
            </Col>
          ))}
        </Row>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Statistic
            title="平均每天生產才數"
            value={avgCaiPerDay}
            precision={0}
            suffix="才/天"
          />
          <Button icon={<Plus size={14} />} onClick={() => setMetricModalOpen(true)}>
            新增追蹤指標
          </Button>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: 'rgba(0,0,0,0.65)' }}>備註</label>
          <Input.TextArea
            rows={2}
            value={record.note}
            onChange={(e) => setRecord((prev) => ({ ...prev, note: e.target.value }))}
          />
        </div>
      </Card>

      <Card variant="borderless" title="歷史生產紀錄">
        <ResponsiveTable<ProductionRecordRow>
          rowKey="periodMonth"
          size="small"
          loading={loading}
          dataSource={history}
          pagination={{ pageSize: 12 }}
          emptyText="尚未建立生產紀錄"
          columns={[
            { title: '月份', dataIndex: 'periodMonth', key: 'periodMonth', mobilePrimary: true },
            { title: '工作天數', dataIndex: 'workingDays', key: 'workingDays', render: (v: number) => `${v ?? 0} 天` },
            {
              title: '生產才數',
              dataIndex: 'producedCai',
              key: 'producedCai',
              render: (v: number) => `${(v ?? 0).toLocaleString()} 才`,
            },
            {
              title: '平均每天',
              key: 'avgCaiPerDay',
              render: (_: unknown, row) =>
                `${Math.round(computeAvgCaiPerDay(row.producedCai || 0, row.workingDays || 0)).toLocaleString()} 才`,
            },
            {
              title: '平均膜厚',
              dataIndex: 'avgFilmThicknessUm',
              key: 'avgFilmThicknessUm',
              render: (v?: number) => (v ? `${v} μm` : '-'),
            },
            {
              title: '噴粉量',
              dataIndex: 'powderUsageKg',
              key: 'powderUsageKg',
              render: (v?: number) => (v ? `${v.toLocaleString()} kg` : '-'),
            },
          ]}
        />
      </Card>

      <Modal
        open={metricModalOpen}
        title="新增追蹤指標"
        okText="新增"
        cancelText="取消"
        onCancel={() => setMetricModalOpen(false)}
        onOk={onAddMetric}
      >
        <label style={{ display: 'block', marginBottom: 6 }}>指標名稱</label>
        <Input
          placeholder="例如：不良重工才數"
          value={metricLabel}
          onChange={(e) => setMetricLabel(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <label style={{ display: 'block', marginBottom: 6 }}>單位（選填）</label>
        <Input placeholder="例如：才、kg、次" value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} />
      </Modal>
    </>
  );
}

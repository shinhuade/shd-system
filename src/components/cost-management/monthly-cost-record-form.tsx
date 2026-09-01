'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, InputNumber, Row } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'material', label: '粉料成本' },
  { key: 'packaging', label: '包材成本' },
  { key: 'gas', label: '瓦斯成本' },
  { key: 'water', label: '水費' },
  { key: 'electricity', label: '電費' },
  { key: 'labor', label: '人工成本' },
  { key: 'fixed_other', label: '其他固定成本' },
];

export default function MonthlyCostRecordForm() {
  const { message } = App.useApp();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const periodMonth = month.format('YYYY-MM');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/cost-records?periodMonth=${periodMonth}`);
        const result = await res.json();
        if (!mounted) return;
        const next: Record<string, number> = {};
        for (const row of result?.data || []) next[row.category] = row.amount;
        setAmounts(next);
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
  }, [periodMonth]);

  const onSave = async () => {
    setSaving(true);
    try {
      const entries = CATEGORIES.map((c) => ({ category: c.key, amount: amounts[c.key] || 0 }));
      const res = await fetch('/api/admin/cost-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodMonth, entries }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '儲存失敗');
      message.success(`已儲存 ${periodMonth} 的成本紀錄`);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      variant="borderless"
      loading={loading}
      title={
        <DatePicker
          picker="month"
          value={month}
          onChange={(v) => v && setMonth(v)}
          allowClear={false}
        />
      }
      extra={
        <Button type="primary" loading={saving} onClick={onSave}>
          儲存
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        {CATEGORIES.map((c) => (
          <Col xs={24} sm={12} lg={8} key={c.key}>
            <label style={{ display: 'block', marginBottom: 6, color: 'rgba(0,0,0,0.65)' }}>{c.label}</label>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              addonBefore="$"
              value={amounts[c.key] ?? 0}
              onChange={(v) => setAmounts((prev) => ({ ...prev, [c.key]: v ?? 0 }))}
            />
          </Col>
        ))}
      </Row>
    </Card>
  );
}

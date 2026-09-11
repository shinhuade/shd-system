'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Input, InputNumber, Modal, Popconfirm, Row, Statistic } from 'antd';
import { Plus, Trash } from '@styled-icons/fa-solid';
import dayjs, { Dayjs } from 'dayjs';
import {
  COST_RECORD_CATEGORIES,
  resolveCostCategoryGroup,
  resolveCostCategoryLabel,
} from '@/models/schemas/cost-record';

interface CostEntry {
  category: string;
  label?: string;
  amount: number;
}

const KNOWN_CATEGORIES = COST_RECORD_CATEGORIES.map((category) => ({
  category: category as string,
  label: resolveCostCategoryLabel(category),
  isDirect: resolveCostCategoryGroup(category) === 'direct',
}));

/**
 * 每月成本紀錄：工廠每個月輸入一次實際成本，成本模型會用它除以當月生產才數，
 * 算出每才基本成本，精算報價再自動套用（使用者報價時不需要再輸入任何成本）。
 */
export default function MonthlyCostRecordForm() {
  const { message } = App.useApp();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const periodMonth = month.format('YYYY-MM');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/cost-records?periodMonth=${periodMonth}`);
        const result = await res.json();
        if (!mounted) return;
        const rows: CostEntry[] = result?.data || [];
        const byCategory = new Map(rows.map((row) => [row.category, row]));

        // 內建類別固定顯示（即使當月是 0），自訂類別接在後面
        const known = KNOWN_CATEGORIES.map((item) => ({
          category: item.category,
          amount: byCategory.get(item.category)?.amount ?? 0,
        }));
        const custom = rows.filter((row) => !KNOWN_CATEGORIES.some((item) => item.category === row.category));

        setEntries([...known, ...custom]);
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

  const setAmount = (category: string, amount: number) => {
    setEntries((prev) => prev.map((entry) => (entry.category === category ? { ...entry, amount } : entry)));
  };

  const baseTotal = entries
    .filter((entry) => resolveCostCategoryGroup(entry.category) !== 'direct')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const onAddCustom = () => {
    const label = customLabel.trim();
    if (!label) {
      message.error('請輸入成本項目名稱');
      return;
    }
    const category = `custom_${Date.now().toString(36)}`;
    setEntries((prev) => [...prev, { category, label, amount: 0 }]);
    setCustomLabel('');
    setCustomModalOpen(false);
  };

  const onRemoveCustom = (category: string) => {
    setEntries((prev) => prev.filter((entry) => entry.category !== category));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cost-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodMonth,
          entries: entries.map((entry) => ({
            category: entry.category,
            label: entry.label,
            amount: entry.amount || 0,
          })),
          // 使用者刪掉的自訂項目，同步從資料庫移除
          replaceMissing: true,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '儲存失敗');
      message.success(`已儲存 ${periodMonth} 的成本紀錄`);
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
        title={<DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} />}
        extra={
          <Button type="primary" loading={saving} onClick={onSave}>
            儲存
          </Button>
        }
      >
        <p style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
          這裡輸入的是工廠當月「實際發生」的成本。粉體與包材是逐件計算的直接成本，不列入每才基本成本；
          其餘項目（人事／電費／瓦斯／水費／租金／保全／會計／其他／自訂）都會分攤到當月生產才數上。
        </p>

        <Row gutter={[16, 16]}>
          {entries.map((entry) => {
            const isCustom = !KNOWN_CATEGORIES.some((item) => item.category === entry.category);
            const isDirect = resolveCostCategoryGroup(entry.category) === 'direct';
            return (
              <Col xs={24} sm={12} lg={8} key={entry.category}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'rgba(0,0,0,0.65)' }}>
                  <span>{resolveCostCategoryLabel(entry.category, entry.label)}</span>
                  {isDirect && <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>（不列入每才成本）</span>}
                  {isCustom && (
                    <Popconfirm
                      title="移除這個自訂成本項目？"
                      okText="移除"
                      cancelText="取消"
                      onConfirm={() => onRemoveCustom(entry.category)}
                    >
                      <Button size="small" type="text" danger icon={<Trash size={12} />} />
                    </Popconfirm>
                  )}
                </label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  prefix="$"
                  value={entry.amount}
                  onChange={(v) => setAmount(entry.category, v ?? 0)}
                />
              </Col>
            );
          })}
        </Row>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Statistic title="本月基本成本合計（不含粉體／包材）" value={baseTotal} precision={0} prefix="$" />
          <Button icon={<Plus size={14} />} onClick={() => setCustomModalOpen(true)}>
            新增自訂成本項目
          </Button>
        </div>
      </Card>

      <Modal
        open={customModalOpen}
        title="新增自訂成本項目"
        okText="新增"
        cancelText="取消"
        onCancel={() => setCustomModalOpen(false)}
        onOk={onAddCustom}
      >
        <Input
          placeholder="例如：設備維修、勞健保"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onPressEnter={onAddCustom}
        />
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 8 }}>
          自訂項目會歸類為固定成本，一併分攤到每才基本成本。
        </p>
      </Modal>
    </>
  );
}

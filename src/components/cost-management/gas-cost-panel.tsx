'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, App, Button, Card, Col, InputNumber, Row, Skeleton, Tag } from 'antd';
import styled from 'styled-components';
import { computeMonthlyGasCost, NATURAL_GAS_BASE_HEATING_VALUE } from '@/lib/pricing/gas-cost';

const formatMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;
const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString(undefined, { maximumFractionDigits: digits });

interface GasSource {
  configured: boolean;
  unitPrice: number;
  unitLabel?: string;
  priceEffectiveDate?: string;
  priceSource: 'history' | 'current' | 'missing';
}

interface GasCostEstimateResponse {
  periodMonth: string;
  hasProductionRecord: boolean;
  usage: {
    naturalGasUsageM3: number;
    naturalGasAvgHeatingValue: number;
    bottledGasUsageKg: number;
  };
  naturalSource: GasSource;
  bottledSource: GasSource;
}

interface GasUsageDraft {
  naturalGasUsageM3?: number;
  naturalGasAvgHeatingValue?: number;
  bottledGasUsageKg?: number;
}

/**
 * 瓦斯費試算：直接在這張卡片裡填當月用量，即時看到金額，一個按鈕同時
 * 把用量存回生產紀錄、把金額填進上面的成本欄位。
 *
 * 用量欄位放在這裡而不是只讀取生產紀錄，是因為對帳時是看著同一張瓦斯帳單在操作：
 * 抄數字跟看金額對不對，本來就該在同一個畫面完成，不必先跳到生產紀錄頁填完再回來。
 * 存檔一樣會寫進生產紀錄（成本模型的唯一資料來源），兩邊看到的永遠是同一筆。
 *
 * 單價則維持唯讀，來自「水電瓦斯」的牌價版本：單價是有生效日的歷史資料，
 * 在這裡隨手改會破壞其他月份的重算結果，所以只顯示、不編輯。
 */
export default function GasCostPanel({
  periodMonth,
  onApply,
}: {
  periodMonth: string;
  onApply: (amounts: { naturalGas: number; bottledGas: number }) => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [source, setSource] = useState<GasCostEstimateResponse | null>(null);
  const [draft, setDraft] = useState<GasUsageDraft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch(`/api/admin/cost-records/gas-estimate?periodMonth=${periodMonth}`);
        const result = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(result?.message || '讀取瓦斯資料失敗');
        const data = result.data as GasCostEstimateResponse;
        setSource(data);
        // 已存的用量帶進輸入框；0 視為未填，避免一進來就顯示一堆 0
        setDraft({
          naturalGasUsageM3: data.usage.naturalGasUsageM3 || undefined,
          naturalGasAvgHeatingValue: data.usage.naturalGasAvgHeatingValue || undefined,
          bottledGasUsageKg: data.usage.bottledGasUsageKg || undefined,
        });
        setError(undefined);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '讀取瓦斯資料失敗');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [periodMonth, reloadToken]);

  const reload = () => {
    setLoading(true);
    setReloadToken((v) => v + 1);
  };

  // 即時試算：使用者一邊改用量就一邊看到金額，用的是與後端相同的純函式引擎
  const quote = computeMonthlyGasCost({
    natural: {
      supplyVolumeM3: draft.naturalGasUsageM3 ?? 0,
      unitPricePerM3: source?.naturalSource.unitPrice ?? 0,
      avgHeatingValueKcal: draft.naturalGasAvgHeatingValue ?? 0,
    },
    bottled: {
      usageKg: draft.bottledGasUsageKg ?? 0,
      unitPricePerKg: source?.bottledSource.unitPrice ?? 0,
    },
  });

  // 只在「有用量卻缺對應設定」時才提醒，沒用到的瓦斯種類不該跳警告
  const warnings: { text: string; action?: { label: string; href: string } }[] = [];
  if (source) {
    if ((draft.naturalGasUsageM3 ?? 0) > 0 && !source.naturalSource.configured) {
      warnings.push({
        text: '尚未建立「天然氣」牌價，目前單價以 0 計算',
        action: { label: '去建立', href: '/admin/utilities' },
      });
    }
    if ((draft.naturalGasUsageM3 ?? 0) > 0 && !(draft.naturalGasAvgHeatingValue ?? 0)) {
      warnings.push({ text: '未填平均熱值，暫不做熱值調整（等同係數 1），金額會與帳單有落差' });
    }
    if ((draft.bottledGasUsageKg ?? 0) > 0 && !source.bottledSource.configured) {
      warnings.push({
        text: '尚未建立「桶裝瓦斯」牌價，目前單價以 0 計算',
        action: { label: '去建立', href: '/admin/utilities' },
      });
    }
  }

  const onSaveAndApply = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/production-records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodMonth,
          naturalGasUsageM3: draft.naturalGasUsageM3 ?? 0,
          naturalGasAvgHeatingValue: draft.naturalGasAvgHeatingValue ?? 0,
          bottledGasUsageKg: draft.bottledGasUsageKg ?? 0,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || '儲存用量失敗');

      onApply({ naturalGas: quote.natural.amount, bottledGas: quote.bottled.amount });
      message.success('用量已存入生產紀錄，金額已填入上方成本欄位，確認後請按「儲存」');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '儲存用量失敗');
    } finally {
      setSaving(false);
    }
  };

  const priceHint = (s: GasSource, unit: string) => {
    if (!s.configured) return '尚未建立牌價';
    const base = `$${formatNumber(s.unitPrice, 4)} / ${unit}`;
    if (s.priceSource === 'current') return `${base}（主檔目前值，尚無價格版本）`;
    const on = s.priceEffectiveDate ? `${String(s.priceEffectiveDate).slice(0, 10)} 起` : '';
    return `${base}${on ? `（${on}）` : ''}`;
  };

  return (
    <Card
      variant="borderless"
      style={{ marginTop: 16 }}
      title="瓦斯費試算"
      extra={
        <Button size="small" onClick={reload} loading={loading}>
          重新讀取
        </Button>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : error ? (
        <Alert
          type="warning"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={reload}>
              重試
            </Button>
          }
        />
      ) : source ? (
        <>
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            對著 {periodMonth} 的瓦斯帳單把用量填進來，金額會即時算好。單價取自「水電瓦斯」當月有效的牌價。
          </p>

          <GasBlock>
            <div className="head">
              <strong>天然氣</strong>
              <Tag color="blue">按 m³ ＋ 熱值調整</Tag>
              <span className="price">{priceHint(source.naturalSource, 'm³')}</span>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8}>
                <label>供氣量</label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  suffix="m³"
                  inputMode="decimal"
                  value={draft.naturalGasUsageM3}
                  onChange={(v) => setDraft((prev) => ({ ...prev, naturalGasUsageM3: v ?? undefined }))}
                />
              </Col>
              <Col xs={12} sm={8}>
                <label>平均熱值</label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  suffix="kcal/m³"
                  inputMode="decimal"
                  placeholder={String(NATURAL_GAS_BASE_HEATING_VALUE)}
                  value={draft.naturalGasAvgHeatingValue}
                  onChange={(v) => setDraft((prev) => ({ ...prev, naturalGasAvgHeatingValue: v ?? undefined }))}
                />
              </Col>
            </Row>

            <div className="row" style={{ marginTop: 10 }}>
              <span>供氣量 × 單價</span>
              <span>{formatMoney(quote.natural.rawAmount)}</span>
            </div>
            <div className="row">
              <span>
                熱值調整 {formatNumber(quote.natural.avgHeatingValueKcal, 0)} ÷ {NATURAL_GAS_BASE_HEATING_VALUE}
              </span>
              <span>
                × {formatNumber(quote.natural.heatingValueFactor, 6)}
                {quote.natural.heatingValueAdjustment !== 0 && (
                  <em style={{ marginLeft: 6, fontStyle: 'normal', color: 'rgba(0,0,0,0.45)' }}>
                    （{quote.natural.heatingValueAdjustment > 0 ? '+' : ''}
                    {formatMoney(quote.natural.heatingValueAdjustment)}）
                  </em>
                )}
              </span>
            </div>
            <div className="row total">
              <span>天然氣費</span>
              <strong>{formatMoney(quote.natural.amount)}</strong>
            </div>
          </GasBlock>

          <GasBlock>
            <div className="head">
              <strong>桶裝瓦斯</strong>
              <Tag color="orange">按 kg，無熱值調整</Tag>
              <span className="price">{priceHint(source.bottledSource, 'kg')}</span>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8}>
                <label>用量</label>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  suffix="kg"
                  inputMode="decimal"
                  value={draft.bottledGasUsageKg}
                  onChange={(v) => setDraft((prev) => ({ ...prev, bottledGasUsageKg: v ?? undefined }))}
                />
              </Col>
            </Row>

            <div className="row total" style={{ marginTop: 10 }}>
              <span>桶裝瓦斯費</span>
              <strong>{formatMoney(quote.bottled.amount)}</strong>
            </div>
          </GasBlock>

          {warnings.map((warning) => (
            <Alert
              key={warning.text}
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={warning.text}
              action={
                warning.action ? (
                  <Button size="small" onClick={() => router.push(warning.action!.href)}>
                    {warning.action.label}
                  </Button>
                ) : undefined
              }
            />
          ))}

          <TotalRow>
            <span>當月瓦斯合計</span>
            <strong>{formatMoney(quote.totalAmount)}</strong>
          </TotalRow>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <Button type="primary" loading={saving} disabled={quote.totalAmount <= 0} onClick={onSaveAndApply}>
              存用量並填入成本
            </Button>
            <Button onClick={() => router.push('/admin/utilities')}>維護瓦斯牌價</Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}

const GasBlock = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;

    .price {
      margin-left: auto;
      font-size: 13px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  label {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 5px 0;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.65);
    flex-wrap: wrap;

    &.total {
      border-top: 1px dashed rgba(0, 0, 0, 0.1);
      margin-top: 6px;
      padding-top: 9px;
      color: rgba(0, 0, 0, 0.88);
    }
  }
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 2px solid var(--accent-color);
  font-size: 16px;

  strong {
    font-size: 24px;
    color: var(--primary-color);
  }
`;

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Skeleton, Tag } from 'antd';
import styled from 'styled-components';
import { NATURAL_GAS_BASE_HEATING_VALUE } from '@/lib/pricing/gas-cost';

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

export interface GasCostEstimateResponse {
  periodMonth: string;
  hasProductionRecord: boolean;
  natural: {
    rawAmount: number;
    heatingValueFactor: number;
    heatingValueAdjustment: number;
    amount: number;
    avgHeatingValueKcal: number;
    baseHeatingValueKcal: number;
    heatingValueNote?: string;
  };
  bottled: { amount: number; usageKg: number; unitPricePerKg: number };
  totalAmount: number;
  naturalSource: GasSource;
  bottledSource: GasSource;
  missing: string[];
}

/**
 * 瓦斯費試算：把當月生產紀錄的用量與當月有效的牌價帶進來，算出天然氣與桶裝瓦斯的金額，
 * 一鍵填進每月成本紀錄，省掉自己按計算機、也避免抄錯。
 *
 * 兩種瓦斯的算式都攤開顯示，使用者可以直接跟帳單逐項對照。
 */
export default function GasCostPanel({
  periodMonth,
  onApply,
}: {
  periodMonth: string;
  onApply: (amounts: { naturalGas: number; bottledGas: number }) => void;
}) {
  const router = useRouter();
  const [estimate, setEstimate] = useState<GasCostEstimateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  // 月份改變或使用者按「重新試算」時重新取一次
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch(`/api/admin/cost-records/gas-estimate?periodMonth=${periodMonth}`);
        const result = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(result?.message || '瓦斯試算失敗');
        setEstimate(result.data);
        setError(undefined);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '瓦斯試算失敗');
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

  const naturalVolume =
    estimate && estimate.naturalSource.unitPrice > 0
      ? estimate.natural.rawAmount / estimate.naturalSource.unitPrice
      : 0;

  return (
    <Card
      variant="borderless"
      style={{ marginTop: 16 }}
      title="瓦斯費試算"
      extra={
        <Button size="small" onClick={reload} loading={loading}>
          重新試算
        </Button>
      }
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : error ? (
        <Alert type="warning" showIcon message={error} action={<Button size="small" onClick={reload}>重試</Button>} />
      ) : estimate ? (
        <>
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            用量來自「每月生產紀錄」，單價取 {periodMonth} 當月有效的牌價。算完按下方按鈕即可填入上面的成本欄位。
          </p>

          {estimate.missing.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="以下資料還沒齊全，試算金額可能與帳單有落差"
              description={
                <ul style={{ paddingLeft: 18, margin: '6px 0 0', lineHeight: 1.9 }}>
                  {estimate.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              }
            />
          )}

          <GasBlock>
            <div className="head">
              <strong>天然氣</strong>
              <Tag color="blue">按 m³ ＋ 熱值調整</Tag>
            </div>
            <div className="row">
              <span>供氣量 × 單價</span>
              <span>
                {formatNumber(naturalVolume)} m³ × ${formatNumber(estimate.naturalSource.unitPrice, 4)} ={' '}
                {formatMoney(estimate.natural.rawAmount)}
              </span>
            </div>
            <div className="row">
              <span>熱值調整</span>
              <span>
                {formatNumber(estimate.natural.avgHeatingValueKcal, 0)} ÷ {NATURAL_GAS_BASE_HEATING_VALUE} ={' '}
                {formatNumber(estimate.natural.heatingValueFactor, 6)}
                {estimate.natural.heatingValueAdjustment !== 0 && (
                  <em style={{ marginLeft: 6, fontStyle: 'normal', color: 'rgba(0,0,0,0.45)' }}>
                    （{estimate.natural.heatingValueAdjustment > 0 ? '+' : ''}
                    {formatMoney(estimate.natural.heatingValueAdjustment)}）
                  </em>
                )}
              </span>
            </div>
            <div className="row total">
              <span>天然氣費</span>
              <strong>{formatMoney(estimate.natural.amount)}</strong>
            </div>
          </GasBlock>

          <GasBlock>
            <div className="head">
              <strong>桶裝瓦斯</strong>
              <Tag color="orange">按 kg，無熱值調整</Tag>
            </div>
            <div className="row">
              <span>用量 × 單價</span>
              <span>
                {formatNumber(estimate.bottled.usageKg)} kg × ${formatNumber(estimate.bottled.unitPricePerKg, 4)}
              </span>
            </div>
            <div className="row total">
              <span>桶裝瓦斯費</span>
              <strong>{formatMoney(estimate.bottled.amount)}</strong>
            </div>
          </GasBlock>

          <TotalRow>
            <span>當月瓦斯合計</span>
            <strong>{formatMoney(estimate.totalAmount)}</strong>
          </TotalRow>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <Button
              type="primary"
              disabled={estimate.totalAmount <= 0}
              onClick={() =>
                onApply({ naturalGas: estimate.natural.amount, bottledGas: estimate.bottled.amount })
              }
            >
              填入本月成本
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
    margin-bottom: 8px;
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

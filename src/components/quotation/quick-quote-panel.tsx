'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Alert, App, Button, Card, Form, InputNumber, Segmented } from 'antd';
import { ArrowLeft, Copy } from '@styled-icons/fa-solid';
import { computeQuickQuote, QuickQuoteUnitMode } from '@/lib/pricing/quick-quote';
import PageHeader from '@/components/page-header';
import DimensionFaceFields from './dimension-face-fields';
import { useCaiInput } from './use-cai-input';

const formatMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;
const formatCai = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * ⚡ 快速報價：尺寸 → 面數 → 才數 → 單價 → 報價，全部在同一頁完成，
 * 不需要任何成本資料，適合電話／LINE／現場詢價。
 */
export default function QuickQuotePanel() {
  const router = useRouter();
  const { message } = App.useApp();
  const cai = useCaiInput();
  const [unitMode, setUnitMode] = useState<QuickQuoteUnitMode>('per_cai');
  const [unitPrice, setUnitPrice] = useState<number>();
  const [caiPerFoot, setCaiPerFoot] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/system-settings/current');
        const result = await res.json();
        if (!mounted) return;
        setCaiPerFoot(result?.data?.caiPerFoot ?? null);
      } catch (err) {
        console.error(err);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const quote = computeQuickQuote({
    dimensions: cai.dimensions,
    faces: cai.faces,
    unitMode,
    unitPrice: unitPrice ?? 0,
    caiPerFoot,
  });

  const canQuote = quote.caiCount > 0 && (unitPrice ?? 0) > 0 && !quote.unavailableReason;

  const onCopy = async () => {
    const { length, width, height } = cai.dimensions;
    const lines = [
      `工件尺寸：${length ?? 0} × ${width ?? 0} × ${height ?? 0} cm`,
      `面數公式：${quote.formulaCode}`,
      `計算才數：${formatCai(quote.caiCount)} 才`,
      unitMode === 'per_cai'
        ? `單價：${formatMoney(unitPrice ?? 0)} / 才`
        : `單價：${formatMoney(unitPrice ?? 0)} / 尺（${formatCai(quote.footCount ?? 0)} 尺）`,
      `報價：${formatMoney(quote.quotedAmount)}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      message.success('已複製報價內容');
    } catch {
      message.error('瀏覽器不允許複製，請長按上方報價內容手動複製');
    }
  };

  return (
    <section>
      <Button
        type="text"
        icon={<ArrowLeft size={14} />}
        onClick={() => router.push('/admin/quotes/new')}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        返回智慧報價
      </Button>

      <PageHeader title="⚡ 快速報價" description="輸入尺寸與面數算出才數，填入單價立刻得到報價" />

      <Form layout="vertical">
        <DimensionFaceFields
          dimensions={cai.dimensions}
          onDimensionsChange={cai.setDimensions}
          faces={cai.faces}
          onFacesChange={cai.setFaces}
          templates={cai.templates}
          selectedTemplateId={cai.selectedTemplateId}
          onSelectTemplate={cai.selectTemplate}
        />

        <Card size="small" title="單價" variant="borderless" style={{ marginTop: 12 }}>
          <Segmented
            block
            size="large"
            value={unitMode}
            onChange={(v) => setUnitMode(v as QuickQuoteUnitMode)}
            options={[
              { label: '一才單價', value: 'per_cai' },
              { label: '一尺單價', value: 'per_foot' },
            ]}
          />
          <Form.Item label={unitMode === 'per_cai' ? '單價（元／才）' : '單價（元／尺）'} style={{ marginTop: 12, marginBottom: 0 }}>
            <InputNumber
              size="large"
              inputMode="decimal"
              style={{ width: '100%' }}
              min={0}
              prefix="$"
              value={unitPrice}
              onChange={(v) => setUnitPrice(v ?? undefined)}
            />
          </Form.Item>

          {unitMode === 'per_foot' && quote.unavailableReason && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={quote.unavailableReason}
              action={
                <Button size="small" onClick={() => router.push('/admin/system-settings')}>
                  前往設定
                </Button>
              }
            />
          )}
        </Card>
      </Form>

      <ResultCard>
        <div className="line">
          <span>📐 計算才數</span>
          <strong>{formatCai(quote.caiCount)} 才</strong>
        </div>
        <div className="line">
          <span>💵 單價</span>
          <strong>
            {formatMoney(unitPrice ?? 0)} / {unitMode === 'per_cai' ? '才' : '尺'}
          </strong>
        </div>
        {unitMode === 'per_foot' && !quote.unavailableReason && (
          <div className="line sub">
            <span>換算尺數</span>
            <span>{formatCai(quote.footCount ?? 0)} 尺</span>
          </div>
        )}
        <div className="total">
          <span>💰 報價</span>
          <strong>{formatMoney(quote.quotedAmount)}</strong>
        </div>
        <Button type="primary" size="large" block icon={<Copy size={16} />} disabled={!canQuote} onClick={onCopy}>
          複製報價
        </Button>
      </ResultCard>
    </section>
  );
}

const ResultCard = styled.div`
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 18px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 16px;

    &.sub {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.55);
      padding-top: 0;
    }
  }

  .total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 12px 0 16px;
    padding-top: 14px;
    border-top: 2px solid var(--accent-color);
    font-size: 18px;

    strong {
      font-size: 30px;
      color: var(--primary-color);
      line-height: 1.2;
    }
  }
`;

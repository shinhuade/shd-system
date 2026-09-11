'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Alert, App, Button, Card, Form, InputNumber, Tag } from 'antd';
import { ArrowLeft, Copy } from '@styled-icons/fa-solid';
import { computeQuickQuote } from '@/lib/pricing/quick-quote';
import { CHI_WIDTH_THRESHOLD_CM, CM_PER_CHI, CM2_PER_CAI } from '@/lib/pricing/area-formula';
import PageHeader from '@/components/page-header';
import DimensionFaceFields from './dimension-face-fields';
import { useCaiInput } from './use-cai-input';

const formatMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;
const formatCai = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * ⚡ 快速報價：尺寸 → 面數 → 才數／尺數 → 單價 → 報價，全部在同一頁完成，
 * 不需要任何成本資料，適合電話／LINE／現場詢價。
 *
 * 計價單位（才／尺）依本廠規則從尺寸自動判定，不讓使用者選，
 * 避免同一件工件被用兩種單位報出兩個價。
 */
export default function QuickQuotePanel() {
  const router = useRouter();
  const { message } = App.useApp();
  const cai = useCaiInput();
  const [unitPrice, setUnitPrice] = useState<number>();

  const quote = computeQuickQuote({
    dimensions: cai.dimensions,
    faces: cai.faces,
    unitPrice: unitPrice ?? 0,
  });

  const isChi = quote.billingUnit === 'chi';
  const unitLabel = isChi ? '尺' : '才';
  const canQuote = quote.billingQuantityPerUnit > 0 && (unitPrice ?? 0) > 0 && !quote.unavailableReason;

  const onCopy = async () => {
    const { length, width, height } = cai.dimensions;
    const lines = [
      `工件尺寸：${length ?? 0} × ${width ?? 0} × ${height ?? 0} cm`,
      ...(isChi ? [] : [`面數公式：${quote.formulaCode}`]),
      `計算${unitLabel}數：${formatCai(quote.billingQuantityPerUnit)} ${unitLabel}`,
      `單價：${formatMoney(unitPrice ?? 0)} / ${unitLabel}`,
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

      <PageHeader title="⚡ 快速報價" description="輸入尺寸與面數算出才數／尺數，填入單價立刻得到報價" />

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

        <Card
          size="small"
          variant="borderless"
          style={{ marginTop: 12 }}
          title={
            <span>
              單價{' '}
              <Tag color={isChi ? 'orange' : 'blue'} style={{ marginInlineStart: 4 }}>
                以「{unitLabel}」計價
              </Tag>
            </span>
          }
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={
              isChi
                ? `寬度 ${formatCai(quote.billingWidthCm)} cm 小於 ${CHI_WIDTH_THRESHOLD_CM} cm，屬細長件，依本廠規則以「尺」計價（尺數 = 最長邊 ÷ ${CM_PER_CHI} cm）`
                : `依本廠規則以「才」計價（才數 = 噴塗面積 ÷ ${CM2_PER_CAI} cm²）`
            }
          />
          <Form.Item label={`單價（元／${unitLabel}）`} style={{ marginBottom: 0 }}>
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

          {quote.unavailableReason && (
            <Alert type="warning" showIcon style={{ marginTop: 12 }} message={quote.unavailableReason} />
          )}
        </Card>
      </Form>

      <ResultCard>
        <div className="line">
          <span>📐 計算{unitLabel}數</span>
          <strong>
            {formatCai(quote.billingQuantityPerUnit)} {unitLabel}
          </strong>
        </div>
        {isChi && (
          <div className="line sub">
            <span>最長邊</span>
            <span>{formatCai(quote.longestEdgeCm)} cm</span>
          </div>
        )}
        <div className="line">
          <span>💵 單價</span>
          <strong>
            {formatMoney(unitPrice ?? 0)} / {unitLabel}
          </strong>
        </div>
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

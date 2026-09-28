'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Alert, App, Button, Card, Col, Form, Input, InputNumber, Row, Select, Skeleton, Tag } from 'antd';
import { ArrowLeft, FloppyDisk } from '@styled-icons/fa-solid';
import PageHeader from '@/components/page-header';
import DimensionFaceFields from './dimension-face-fields';
import { useCaiInput } from './use-cai-input';
import type { PrecisionQuoteResult } from '@/lib/pricing/precision-quote';
import type { CostModel } from '@/lib/pricing/cost-model';

interface MaterialOption {
  _id: string;
  materialCode: string;
  colorName: string;
  currentPricePerKg: number;
  isActive: boolean;
}

interface CustomerOption {
  _id: string;
  name: string;
  customerCode?: string;
  taxId?: string;
  contactPerson?: string;
  phone?: string;
  fax?: string;
  shippingAddress?: string;
  invoiceAddress?: string;
  targetMarginRatePercent?: number;
}

interface MaterialSnapshot {
  materialCode: string;
  colorName: string;
  pricePerKg: number;
  lossRatePercent: number;
}

interface CalculateResponse {
  result: PrecisionQuoteResult;
  costModel: CostModel;
  material: MaterialSnapshot;
  /** 這次試算的目標毛利率是怎麼決定的，由伺服器解析後回傳 */
  marginRateSource: 'input' | 'customer' | 'system';
  targetMarginRatePercent: number;
}

const FILM_THICKNESS_PRESETS = [40, 50, 60, 70, 80, 100];

const formatMoney = (value: number) => `$${Math.round(value).toLocaleString()}`;
/** 每才成本這類小額數字四捨五入到整數會失真，統一保留兩位小數 */
const formatMoneyPrecise = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDecimal = (value: number, digits = 2) => value.toLocaleString(undefined, { maximumFractionDigits: digits });

/**
 * 📊 精算報價：與快速報價共用尺寸／面數／才數，另外加上膜厚與粉體，
 * 成本一律由後台的「每月成本紀錄 + 每月生產紀錄」推導出的成本模型自動帶入，
 * 使用者不需要（也不能）在報價畫面重新輸入人事／水電／瓦斯／租金等成本。
 */
export default function PrecisionQuotePanel() {
  const router = useRouter();
  const { message } = App.useApp();
  const cai = useCaiInput();

  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [materialId, setMaterialId] = useState<string>();
  const [filmThicknessUm, setFilmThicknessUm] = useState<number>(60);
  const [quantity, setQuantity] = useState<number>(1);
  /**
   * 目標毛利率一律由伺服器依「手動覆寫 → 客戶專屬 → 公司標準」解析，
   * 這裡只保存使用者「有沒有手動改過」。留 undefined 就是交給伺服器決定，
   * 客戶換了才會自動跟著換；若在這裡預填公司標準並每次送出，
   * 客戶專屬毛利率永遠不會生效（這正是原本的問題）。
   */
  const [marginRateOverride, setMarginRateOverride] = useState<number>();
  const [systemMarginRatePercent, setSystemMarginRatePercent] = useState<number>();

  const [calculating, setCalculating] = useState(false);
  const [rawCalcError, setCalcError] = useState<string>();
  const [rawData, setData] = useState<CalculateResponse | null>(null);

  const [customerId, setCustomerId] = useState<string>();
  const [workpieceName, setWorkpieceName] = useState('');
  const [chosenPrice, setChosenPrice] = useState<number>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [materialsRes, customersRes, settingsRes] = await Promise.all([
          fetch('/api/admin/materials'),
          // 客戶／廠商共用同一份主檔，報價只該選得到客戶，因此濾掉純廠商
          fetch('/api/generic/customer/all?filterField=isCustomer&filterValue=true'),
          fetch('/api/admin/system-settings/current'),
        ]);
        const [materialsResult, customersResult, settingsResult] = await Promise.all([
          materialsRes.json(),
          customersRes.json(),
          settingsRes.json(),
        ]);
        if (!mounted) return;
        setMaterials((materialsResult?.data || []).filter((m: MaterialOption) => m.isActive));
        setCustomers(customersResult?.data || []);
        setSystemMarginRatePercent(settingsResult?.data?.targetMarginRatePercent ?? undefined);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setOptionsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const facesKey = `${cai.faces.lwFaces}-${cai.faces.lhFaces}-${cai.faces.whFaces}`;
  const dimensionsKey = `${cai.dimensions.length ?? ''}-${cai.dimensions.width ?? ''}-${cai.dimensions.height ?? ''}`;
  const readyToCalculate = Boolean(materialId) && filmThicknessUm > 0 && cai.hasFaces && cai.hasDimensions;

  const calculate = useCallback(async () => {
    if (!materialId) return;
    setCalculating(true);
    setCalcError(undefined);
    try {
      const res = await fetch('/api/admin/quotes/precision/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          dimensions: cai.dimensions,
          ...cai.facePayload,
          workpieceFormulaTemplateId: cai.formulaTemplateId,
          filmThicknessUm,
          quantity,
          customerId,
          targetMarginRatePercent: marginRateOverride,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || '試算失敗');
      setData(result.data);
      setChosenPrice(undefined);
    } catch (err) {
      setData(null);
      setCalcError(err instanceof Error ? err.message : '試算失敗');
    } finally {
      setCalculating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, dimensionsKey, facesKey, filmThicknessUm, quantity, customerId, marginRateOverride]);

  useEffect(() => {
    if (!readyToCalculate) return;
    const timer = setTimeout(calculate, 400);
    return () => clearTimeout(timer);
  }, [readyToCalculate, calculate]);

  const selectedCustomer = customers.find((c) => c._id === customerId);

  /**
   * 顯示用的毛利率與說明。實際採用的值一律由伺服器解析後回傳（data.targetMarginRatePercent），
   * 還沒試算時先用手上的資料推同一套順序，讓欄位提示不會空著。
   */
  const effectiveMarginRate =
    rawData?.targetMarginRatePercent ??
    marginRateOverride ??
    selectedCustomer?.targetMarginRatePercent ??
    systemMarginRatePercent;

  const marginRateSource = rawData?.marginRateSource
    ?? (marginRateOverride != null
      ? 'input'
      : selectedCustomer?.targetMarginRatePercent != null
        ? 'customer'
        : 'system');

  const marginRateHint =
    marginRateSource === 'input'
      ? '手動指定。清空欄位即改回自動（客戶專屬 → 公司標準）'
      : marginRateSource === 'customer'
        ? `已套用 ${selectedCustomer?.name ?? '該客戶'} 的專屬毛利率 ${formatDecimal(effectiveMarginRate ?? 0, 1)}%`
        : `公司標準 ${formatDecimal(effectiveMarginRate ?? 0, 1)}%${
            customerId ? '（這位客戶未設定專屬毛利率）' : ''
          }`;

  // 條件不足時不顯示上一次的試算結果（用衍生值而非在 effect 內清狀態）
  const data = readyToCalculate ? rawData : null;
  const calcError = readyToCalculate ? rawCalcError : undefined;
  const result = data?.result;
  const costModel = data?.costModel;

  // 還缺哪些輸入就直接列出來，避免使用者盯著空白的試算結果不知道要補什麼
  const missingInputs = [
    !customerId && '客戶（決定目標毛利率）',
    !cai.hasDimensions && '工件尺寸（至少填長，加上寬或高）',
    !cai.hasFaces && '面數公式（選一個型態或自訂面數）',
    !materialId && '使用粉體',
    !(filmThicknessUm > 0) && '膜厚',
  ].filter(Boolean) as string[];

  /** 缺系統參數要去系統設定，缺每月成本／生產資料要去成本管理 */
  const errorTarget = calcError?.includes('系統設定') || calcError?.includes('系統參數')
    ? { label: '前往系統設定', href: '/admin/system-settings' }
    : { label: '前往成本管理', href: '/admin/cost-management' };

  const costRows = useMemo(() => {
    if (!result) return [];
    return [
      { label: '粉體成本', value: result.total.powderCost },
      { label: '人工成本', value: result.total.laborCost },
      { label: '能源成本', value: result.total.energyCost },
      { label: '固定成本', value: result.total.fixedCost },
      { label: '損耗', value: result.total.powderLossCost },
    ];
  }, [result]);

  const onSave = async () => {
    if (!result || !materialId) return;
    if (result.unavailableReason) {
      message.error(result.unavailableReason);
      return;
    }
    if (!customerId) {
      message.error('請選擇客戶');
      return;
    }
    if (!workpieceName.trim()) {
      message.error('請輸入工件名稱');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/quotes/precision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          customerId,
          workpieceName: workpieceName.trim(),
          dimensions: cai.dimensions,
          ...cai.facePayload,
          workpieceFormulaTemplateId: cai.formulaTemplateId,
          filmThicknessUm,
          quantity,
          targetMarginRatePercent: marginRateOverride,
          chosenPrice,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || '儲存失敗');
      message.success(`已建立報價 ${json.data.quotation.quotationNo}`);
      router.push(`/admin/quotes/${json.data.quotation._id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
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

      <PageHeader title="📊 精算報價" description="使用最新月份的成本模型，自動算出實際成本與建議報價" />

      {optionsLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={{ span: 24, order: 1 }} lg={{ span: 13, order: 1 }}>
            <Form layout="vertical">
              {/* 客戶擺在最前面：它會決定目標毛利率，選在後面會讓已經算好的價格突然改變 */}
              <Card size="small" title="客戶" variant="borderless" style={{ marginBottom: 12 }}>
                <Form.Item required style={{ marginBottom: selectedCustomer ? 12 : 0 }}>
                  <Select
                    size="large"
                    showSearch
                    allowClear
                    placeholder="搜尋客戶名稱或編號"
                    value={customerId}
                    onChange={(value) => setCustomerId(value ?? undefined)}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    options={customers.map((c) => ({
                      value: c._id,
                      label: c.customerCode ? `${c.name}（${c.customerCode}）` : c.name,
                    }))}
                  />
                </Form.Item>

                {selectedCustomer && (
                  <ContactList>
                    {[
                      ['客戶編號', selectedCustomer.customerCode],
                      ['統一編號', selectedCustomer.taxId],
                      ['聯絡人', selectedCustomer.contactPerson],
                      ['電話', selectedCustomer.phone],
                      ['傳真', selectedCustomer.fax],
                      ['送貨地址', selectedCustomer.shippingAddress],
                      ['發票地址', selectedCustomer.invoiceAddress],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div className="row" key={label}>
                          <span>{label}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    <div className="edit">
                      <Button size="small" type="link" onClick={() => router.push(`/admin/customer/${selectedCustomer._id}`)}>
                        維護這位客戶的資料
                      </Button>
                    </div>
                  </ContactList>
                )}
              </Card>

              <DimensionFaceFields
                dimensions={cai.dimensions}
                onDimensionsChange={cai.setDimensions}
                faces={cai.faces}
                onFacesChange={cai.setFaces}
                templates={cai.templates}
                selectedTemplateId={cai.selectedTemplateId}
                onSelectTemplate={cai.selectTemplate}
              />

              <Card size="small" title="膜厚" variant="borderless" style={{ marginTop: 12 }}>
                <PresetGrid>
                  {FILM_THICKNESS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={filmThicknessUm === preset ? 'is-active' : ''}
                      onClick={() => setFilmThicknessUm(preset)}
                    >
                      {preset} μm
                    </button>
                  ))}
                </PresetGrid>
                <Form.Item label="自訂膜厚 (μm)" style={{ marginTop: 12, marginBottom: 0 }}>
                  <InputNumber
                    size="large"
                    inputMode="decimal"
                    style={{ width: '100%' }}
                    min={0}
                    value={filmThicknessUm}
                    onChange={(v) => setFilmThicknessUm(v ?? 0)}
                  />
                </Form.Item>
              </Card>

              <Card size="small" title="粉體與數量" variant="borderless" style={{ marginTop: 12 }}>
                <Form.Item label="使用粉體" required style={{ marginBottom: 12 }}>
                  <Select
                    size="large"
                    showSearch
                    placeholder="搜尋粉體編號或顏色"
                    value={materialId}
                    onChange={setMaterialId}
                    filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                    options={materials.map((m) => ({
                      value: m._id,
                      label: `${m.colorName}（${m.materialCode}）— $${m.currentPricePerKg}/kg`,
                    }))}
                  />
                </Form.Item>
                <Row gutter={12}>
                  <Col xs={12}>
                    <Form.Item label="數量" style={{ marginBottom: 0 }}>
                      <InputNumber
                        size="large"
                        inputMode="numeric"
                        style={{ width: '100%' }}
                        min={1}
                        value={quantity}
                        onChange={(v) => setQuantity(v ?? 1)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item
                      label="目標毛利率 (%)"
                      style={{ marginBottom: 0 }}
                      extra={marginRateHint}
                    >
                      <InputNumber
                        size="large"
                        inputMode="decimal"
                        style={{ width: '100%' }}
                        min={0}
                        max={99}
                        placeholder={effectiveMarginRate != null ? String(effectiveMarginRate) : undefined}
                        value={marginRateOverride}
                        onChange={(v) => setMarginRateOverride(v ?? undefined)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Form>
          </Col>

          <Col xs={{ span: 24, order: 2 }} lg={{ span: 11, order: 2 }}>
            <Card
              variant="borderless"
              title="精算結果"
              loading={calculating && !result}
              extra={
                result ? (
                  <Button size="small" loading={calculating} onClick={calculate}>
                    重新試算
                  </Button>
                ) : null
              }
            >
              {calcError && (
                <>
                  <Alert type="warning" showIcon message={calcError} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <Button onClick={calculate}>重新試算</Button>
                    <Button type="primary" onClick={() => router.push(errorTarget.href)}>
                      {errorTarget.label}
                    </Button>
                  </div>
                </>
              )}

              {!calcError && !result && (
                <div>
                  <p style={{ color: 'rgba(0,0,0,0.45)', marginBottom: missingInputs.length ? 8 : 0 }}>
                    填好以下項目就會自動試算：
                  </p>
                  <ul style={{ paddingLeft: 18, color: 'rgba(0,0,0,0.65)', lineHeight: 1.9 }}>
                    {missingInputs.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {materials.length === 0 && !optionsLoading && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginTop: 8 }}
                      message="尚未建立粉體資料"
                      description="精算報價需要粉體單價，請先到「粉料管理」新增粉體與價格。"
                      action={
                        <Button size="small" onClick={() => router.push('/admin/materials')}>
                          前往粉料管理
                        </Button>
                      }
                    />
                  )}
                </div>
              )}

              {/* 走「尺」的細長件無法套用每才成本模型，只說明原因並導去快速報價，不輸出 $0 */}
              {result?.unavailableReason && (
                <Alert
                  type="warning"
                  showIcon
                  message="這件工件無法精算"
                  description={result.unavailableReason}
                  action={
                    <Button size="small" onClick={() => router.push('/admin/quotes/new/quick')}>
                      改用快速報價
                    </Button>
                  }
                />
              )}

              {result && costModel && !result.unavailableReason && (
                <>
                  <SummaryList>
                    <div className="row">
                      <span>工件尺寸</span>
                      <span>
                        {cai.dimensions.length ?? 0} × {cai.dimensions.width ?? 0} × {cai.dimensions.height ?? 0} cm
                      </span>
                    </div>
                    <div className="row">
                      <span>面數</span>
                      <Tag color="blue">{result.formulaCode}</Tag>
                    </div>
                    <div className="row">
                      <span>計算才數</span>
                      <strong>
                        {formatDecimal(result.caiCount)} 才{result.quantity > 1 ? ` × ${result.quantity} = ${formatDecimal(result.totalCaiCount)} 才` : ''}
                      </strong>
                    </div>
                    <div className="row">
                      <span>膜厚</span>
                      <span>{formatDecimal(result.filmThicknessUm, 1)} μm</span>
                    </div>
                    <div className="row">
                      <span>粉體用量</span>
                      <span>{formatDecimal(result.powderUsageKg, 3)} kg</span>
                    </div>
                  </SummaryList>

                  {/* 粉體用量算出 0 時粉體成本一定是 0，直接說明原因，不要讓使用者看到莫名其妙的 $0 */}
                  {result.powderUsageKg === 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginTop: 12 }}
                      message="粉體用量算出 0，粉體成本不會計入"
                      description="請確認「系統設定」的粉料用量係數（粉體密度 g/m²/μm）與噴塗轉移率都不是 0，膜厚也要大於 0。"
                      action={
                        <Button size="small" onClick={() => router.push('/admin/system-settings')}>
                          前往系統設定
                        </Button>
                      }
                    />
                  )}

                  <Divider />

                  <SummaryList>
                    {costRows.map((row) => (
                      <div className="row" key={row.label}>
                        <span>{row.label}</span>
                        <span>{formatMoney(row.value)}</span>
                      </div>
                    ))}
                  </SummaryList>

                  <Divider />

                  <Highlight>
                    <div className="head">📊 預估實際成本</div>
                    <div className="value">{formatMoney(result.total.totalCost)}</div>
                    <div className="sub">目前成本／才：{formatMoneyPrecise(result.costPerCai)}</div>
                  </Highlight>

                  <Divider />

                  <SummaryList>
                    <div className="row">
                      <span>目標毛利率</span>
                      <strong>{formatDecimal(result.targetMarginRatePercent, 1)} %</strong>
                    </div>
                  </SummaryList>

                  <Highlight className="price">
                    <div className="head">💰 建議報價</div>
                    <div className="value">{formatMoney(result.suggestedPrice)}</div>
                    <div className="sub">
                      預估毛利 {formatMoney(result.marginAmount)}　預估毛利率 {formatDecimal(result.marginRatePercent, 1)} %
                    </div>
                  </Highlight>

                  <ModelNote>
                    成本模型來源：{costModel.periodMonth}（當月基本成本 {formatMoney(costModel.baseCostTotal)} ÷ 生產{' '}
                    {formatDecimal(costModel.producedCai, 0)} 才 = 每才 {formatMoneyPrecise(costModel.baseCostPerCai)}）
                    <br />
                    粉體單價：${formatDecimal(data.material.pricePerKg, 2)}/kg（{data.material.colorName}）　損耗率{' '}
                    {formatDecimal(data.material.lossRatePercent, 1)}%
                  </ModelNote>

                  <Card size="small" variant="borderless" style={{ marginTop: 16, background: '#fafafa' }}>
                    <Form layout="vertical">
                      <Form.Item label="工件名稱" required style={{ marginBottom: 12 }}>
                        <Input
                          size="large"
                          placeholder="例如：鋁製支架"
                          value={workpieceName}
                          onChange={(e) => setWorkpieceName(e.target.value)}
                        />
                      </Form.Item>
                      <Form.Item
                        label="最終報價（留空則採用建議報價）"
                        style={{ marginBottom: 12 }}
                      >
                        <InputNumber
                          size="large"
                          inputMode="decimal"
                          style={{ width: '100%' }}
                          min={0}
                          prefix="$"
                          placeholder={String(Math.round(result.suggestedPrice))}
                          value={chosenPrice}
                          onChange={(v) => setChosenPrice(v ?? undefined)}
                        />
                      </Form.Item>
                      <Button
                        type="primary"
                        size="large"
                        block
                        icon={<FloppyDisk size={16} />}
                        loading={saving}
                        onClick={onSave}
                      >
                        儲存報價紀錄
                      </Button>
                    </Form>
                  </Card>
                </>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </section>
  );
}

const ContactList = styled.div`
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
  padding-top: 10px;

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 3px 0;
    font-size: 13px;
    flex-wrap: wrap;

    span:first-child {
      color: rgba(0, 0, 0, 0.45);
      flex-shrink: 0;
    }

    span:last-child {
      text-align: right;
      word-break: break-all;
    }
  }

  .edit {
    margin-top: 4px;
    text-align: right;
  }
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;

  button {
    padding: 12px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.15s;

    &.is-active {
      border-color: var(--primary-color);
      background: var(--accent-color);
      color: var(--primary-color);
      font-weight: 600;
    }
  }
`;

const SummaryList = styled.div`
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 5px 0;

    > span:first-child {
      color: rgba(0, 0, 0, 0.55);
    }
  }
`;

const Divider = styled.div`
  height: 1px;
  background: var(--accent-color);
  margin: 12px 0;
`;

const Highlight = styled.div`
  text-align: center;
  padding: 12px 0;

  .head {
    color: rgba(0, 0, 0, 0.55);
    font-size: 14px;
  }

  .value {
    font-size: 30px;
    font-weight: 700;
    color: var(--primary-color);
    line-height: 1.3;
  }

  .sub {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.55);
  }

  &.price .value {
    font-size: 34px;
  }
`;

const ModelNote = styled.p`
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
`;

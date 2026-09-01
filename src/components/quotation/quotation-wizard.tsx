'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Steps,
  Tag,
} from 'antd';

interface Material {
  _id: string;
  materialCode: string;
  colorName: string;
  currentPricePerKg: number;
  isActive: boolean;
}

interface PackagingItem {
  _id: string;
  packagingCode: string;
  name: string;
  isActive: boolean;
}

interface Customer {
  _id: string;
  name: string;
}

interface WorkpieceForm {
  workpieceName: string;
  workpieceCode?: string;
  length?: number;
  width?: number;
  height?: number;
  quantity: number;
  unitWeightKg?: number;
  materialTypeLabel?: string;
  surfaceCondition?: string;
  needsPretreatment: boolean;
  needsRustProof: boolean;
  needsRustRemoval: boolean;
  paintColor?: string;
  materialId?: string;
  estimatedFilmThicknessUm?: number;
  packagingId?: string;
  hangCount: number;
  ovenCapacityPerBatch: number;
  batchCount: number;
  estimatedProcessingHours?: number;
  pretreatmentCost?: number;
  outsourcingCost?: number;
  wastageCost?: number;
}

interface CalcResult {
  breakdown: {
    materialCost: number;
    laborCost: number;
    gasCost: number;
    electricityCost: number;
    waterCost: number;
    packagingCost: number;
    pretreatmentCost: number;
    outsourcingCost: number;
    wastageCost: number;
    indirectCostTotal: number;
    totalCost: number;
  };
  suggestion: {
    costPrice: number;
    standardPrice: number;
    highMarginPrice: number;
    tiers: Record<'cost' | 'standard' | 'high_margin', { price: number; marginAmount: number; marginRatePercent: number; markupRatePercent: number }>;
  };
}

const STEPS = ['工件尺寸', '選擇粉料', '數量與生產參數', '報價結果'];

export default function QuotationWizard() {
  const router = useRouter();
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>();

  const [workpiece, setWorkpiece] = useState<WorkpieceForm>({
    workpieceName: '',
    quantity: 1,
    needsPretreatment: false,
    needsRustProof: false,
    needsRustRemoval: false,
    hangCount: 0,
    ovenCapacityPerBatch: 0,
    batchCount: 1,
  });
  const update = (patch: Partial<WorkpieceForm>) => setWorkpiece((prev) => ({ ...prev, ...patch }));

  const [result, setResult] = useState<CalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [chosenTier, setChosenTier] = useState<'cost' | 'standard' | 'high_margin' | 'custom'>('standard');
  const [customPrice, setCustomPrice] = useState<number>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ quotationNo: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoadingOptions(true);
        const [materialsRes, packagingRes, customersRes] = await Promise.all([
          fetch('/api/admin/materials'),
          fetch('/api/admin/packaging'),
          fetch('/api/generic/customer/all'),
        ]);
        const materialsResult = await materialsRes.json();
        const packagingResult = await packagingRes.json();
        const customersResult = await customersRes.json();
        if (!mounted) return;
        setMaterials((materialsResult?.data || []).filter((m: Material) => m.isActive));
        setPackagingItems((packagingResult?.data || []).filter((p: PackagingItem) => p.isActive));
        setCustomers(customersResult?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const canCalculate = Boolean(workpiece.materialId && workpiece.quantity > 0);

  useEffect(() => {
    let mounted = true;

    const calculate = async () => {
      if (!canCalculate) {
        setResult(null);
        return;
      }

      try {
        setCalculating(true);
        setCalcError(null);
        const res = await fetch('/api/admin/quotes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialId: workpiece.materialId,
            packagingId: workpiece.packagingId,
            workpiece: {
              dimensions: { length: workpiece.length, width: workpiece.width, height: workpiece.height },
              quantity: workpiece.quantity,
              unitWeightKg: workpiece.unitWeightKg,
              estimatedFilmThicknessUm: workpiece.estimatedFilmThicknessUm,
              hangCount: workpiece.hangCount,
              ovenCapacityPerBatch: workpiece.ovenCapacityPerBatch,
              batchCount: workpiece.batchCount,
              estimatedProcessingHours: workpiece.estimatedProcessingHours,
              needsPretreatment: workpiece.needsPretreatment,
              needsRustProof: workpiece.needsRustProof,
              needsRustRemoval: workpiece.needsRustRemoval,
              pretreatmentCost: workpiece.pretreatmentCost,
              outsourcingCost: workpiece.outsourcingCost,
              wastageCost: workpiece.wastageCost,
            },
          }),
        });
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setResult(null);
          setCalcError(json.message || '計算失敗');
        } else {
          setResult(json.data);
        }
      } catch (err) {
        if (mounted) {
          setResult(null);
          setCalcError(err instanceof Error ? err.message : '計算失敗');
        }
      } finally {
        if (mounted) setCalculating(false);
      }
    };

    calculate();

    return () => {
      mounted = false;
    };
  }, [
    canCalculate,
    workpiece.materialId,
    workpiece.packagingId,
    workpiece.length,
    workpiece.width,
    workpiece.height,
    workpiece.quantity,
    workpiece.unitWeightKg,
    workpiece.estimatedFilmThicknessUm,
    workpiece.hangCount,
    workpiece.ovenCapacityPerBatch,
    workpiece.batchCount,
    workpiece.estimatedProcessingHours,
    workpiece.needsPretreatment,
    workpiece.needsRustProof,
    workpiece.needsRustRemoval,
    workpiece.pretreatmentCost,
    workpiece.outsourcingCost,
    workpiece.wastageCost,
  ]);

  const onSubmitQuotation = async () => {
    if (!customerId) {
      message.error('請選擇客戶');
      return;
    }
    if (!result) {
      message.error('請先完成成本試算');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          status: 'final',
          items: [
            {
              workpieceName: workpiece.workpieceName || '未命名工件',
              workpieceCode: workpiece.workpieceCode,
              dimensions: { length: workpiece.length, width: workpiece.width, height: workpiece.height },
              quantity: workpiece.quantity,
              unitWeightKg: workpiece.unitWeightKg,
              materialTypeLabel: workpiece.materialTypeLabel,
              surfaceCondition: workpiece.surfaceCondition,
              needsPretreatment: workpiece.needsPretreatment,
              needsRustProof: workpiece.needsRustProof,
              needsRustRemoval: workpiece.needsRustRemoval,
              paintColor: workpiece.paintColor,
              materialId: workpiece.materialId,
              estimatedFilmThicknessUm: workpiece.estimatedFilmThicknessUm,
              packagingId: workpiece.packagingId,
              hangCount: workpiece.hangCount,
              ovenCapacityPerBatch: workpiece.ovenCapacityPerBatch,
              batchCount: workpiece.batchCount,
              estimatedProcessingHours: workpiece.estimatedProcessingHours,
              pretreatmentCost: workpiece.pretreatmentCost,
              outsourcingCost: workpiece.outsourcingCost,
              wastageCost: workpiece.wastageCost,
              chosenTier,
              customPrice: chosenTier === 'custom' ? customPrice : undefined,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || '建立報價失敗');
      setSubmitted({ quotationNo: json.data.quotation.quotationNo });
      message.success('報價已建立');
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Result
        status="success"
        title="報價已建立"
        subTitle={`報價單號：${submitted.quotationNo}`}
        extra={[
          <Button key="list" onClick={() => router.push('/admin/quotes')}>
            查看報價紀錄
          </Button>,
          <Button
            key="new"
            type="primary"
            onClick={() => {
              setSubmitted(null);
              setStep(0);
              setResult(null);
              setWorkpiece({
                workpieceName: '',
                quantity: 1,
                needsPretreatment: false,
                needsRustProof: false,
                needsRustRemoval: false,
                hangCount: 0,
                ovenCapacityPerBatch: 0,
                batchCount: 1,
              });
            }}
          >
            建立下一張報價
          </Button>,
        ]}
      />
    );
  }

  const selectedMaterial = materials.find((m) => m._id === workpiece.materialId);

  return (
    <section>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>智慧報價</h1>
        <p style={{ color: 'rgba(0,0,0,0.45)' }}>輸入尺寸 → 選粉料 → 輸入數量 → 立即看到成本與建議報價</p>
      </div>

      <Steps current={step} items={STEPS.map((title) => ({ title }))} style={{ marginBottom: 24 }} />

      {loadingOptions ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Card variant="borderless">
              {step === 0 && (
                <Form layout="vertical">
                  <Form.Item label="工件名稱" required>
                    <Input value={workpiece.workpieceName} onChange={(e) => update({ workpieceName: e.target.value })} placeholder="例如：鋁製支架" />
                  </Form.Item>
                  <Form.Item label="工件編號（選填）">
                    <Input value={workpiece.workpieceCode} onChange={(e) => update({ workpieceCode: e.target.value })} />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="長 (mm)">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.length} onChange={(v) => update({ length: v ?? undefined })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="寬 (mm)">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.width} onChange={(v) => update({ width: v ?? undefined })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="高 (mm)">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.height} onChange={(v) => update({ height: v ?? undefined })} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="數量" required>
                        <InputNumber style={{ width: '100%' }} min={1} value={workpiece.quantity} onChange={(v) => update({ quantity: v ?? 1 })} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="單件重量 (kg)">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.unitWeightKg} onChange={(v) => update({ unitWeightKg: v ?? undefined })} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" block onClick={() => setStep(1)} disabled={!workpiece.workpieceName || !workpiece.quantity}>
                    下一步
                  </Button>
                </Form>
              )}

              {step === 1 && (
                <Form layout="vertical">
                  <Form.Item label="粉料型號" required>
                    <Select
                      showSearch
                      placeholder="搜尋粉料編號或顏色"
                      value={workpiece.materialId}
                      onChange={(v) => update({ materialId: v })}
                      filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                      options={materials.map((m) => ({
                        value: m._id,
                        label: `${m.colorName}（${m.materialCode}）— $${m.currentPricePerKg}/kg`,
                      }))}
                    />
                  </Form.Item>

                  <Collapse
                    ghost
                    items={[
                      {
                        key: 'advanced',
                        label: '進階選項（材質/表面狀況/前處理/防鏽/膜厚/包材）',
                        children: (
                          <>
                            <Row gutter={12}>
                              <Col span={12}>
                                <Form.Item label="材質">
                                  <Input value={workpiece.materialTypeLabel} onChange={(e) => update({ materialTypeLabel: e.target.value })} />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="烤漆顏色">
                                  <Input value={workpiece.paintColor} onChange={(e) => update({ paintColor: e.target.value })} />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Form.Item label="表面狀況">
                              <Input value={workpiece.surfaceCondition} onChange={(e) => update({ surfaceCondition: e.target.value })} />
                            </Form.Item>
                            <Space orientation="vertical">
                              <Checkbox checked={workpiece.needsPretreatment} onChange={(e) => update({ needsPretreatment: e.target.checked })}>
                                需要前處理
                              </Checkbox>
                              <Checkbox checked={workpiece.needsRustProof} onChange={(e) => update({ needsRustProof: e.target.checked })}>
                                需要防鏽處理
                              </Checkbox>
                              <Checkbox checked={workpiece.needsRustRemoval} onChange={(e) => update({ needsRustRemoval: e.target.checked })}>
                                需要除鏽處理
                              </Checkbox>
                            </Space>
                            {(workpiece.needsPretreatment || workpiece.needsRustProof || workpiece.needsRustRemoval) && (
                              <Form.Item label="前處理/特殊處理整批成本 ($)" style={{ marginTop: 12 }}>
                                <InputNumber style={{ width: '100%' }} min={0} value={workpiece.pretreatmentCost} onChange={(v) => update({ pretreatmentCost: v ?? undefined })} />
                              </Form.Item>
                            )}
                            <Row gutter={12} style={{ marginTop: 12 }}>
                              <Col span={12}>
                                <Form.Item label="預估膜厚 (μm)">
                                  <InputNumber style={{ width: '100%' }} min={0} value={workpiece.estimatedFilmThicknessUm} onChange={(v) => update({ estimatedFilmThicknessUm: v ?? undefined })} />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="包裝方式">
                                  <Select
                                    allowClear
                                    placeholder="選擇包材"
                                    value={workpiece.packagingId}
                                    onChange={(v) => update({ packagingId: v })}
                                    options={packagingItems.map((p) => ({ value: p._id, label: p.name }))}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </>
                        ),
                      },
                    ]}
                  />

                  <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
                    <Button onClick={() => setStep(0)}>上一步</Button>
                    <Button type="primary" onClick={() => setStep(2)} disabled={!workpiece.materialId}>
                      下一步
                    </Button>
                  </Space>
                </Form>
              )}

              {step === 2 && (
                <Form layout="vertical">
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="掛件數">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.hangCount} onChange={(v) => update({ hangCount: v ?? 0 })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="烤爐容量（每批）">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.ovenCapacityPerBatch} onChange={(v) => update({ ovenCapacityPerBatch: v ?? 0 })} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="生產批次數">
                        <InputNumber style={{ width: '100%' }} min={1} value={workpiece.batchCount} onChange={(v) => update({ batchCount: v ?? 1 })} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="預估生產工時（選填，留空則依批次數自動估算）">
                    <InputNumber style={{ width: '100%' }} min={0} value={workpiece.estimatedProcessingHours} onChange={(v) => update({ estimatedProcessingHours: v ?? undefined })} />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="外包成本 ($，選填)">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.outsourcingCost} onChange={(v) => update({ outsourcingCost: v ?? undefined })} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="損耗成本 ($，選填)">
                        <InputNumber style={{ width: '100%' }} min={0} value={workpiece.wastageCost} onChange={(v) => update({ wastageCost: v ?? undefined })} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Button onClick={() => setStep(1)}>上一步</Button>
                    <Button type="primary" onClick={() => setStep(3)}>
                      計算報價
                    </Button>
                  </Space>
                </Form>
              )}

              {step === 3 && (
                <Form layout="vertical">
                  <Form.Item label="客戶" required>
                    <Select
                      showSearch
                      placeholder="選擇客戶"
                      value={customerId}
                      onChange={setCustomerId}
                      filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                      options={customers.map((c) => ({ value: c._id, label: c.name }))}
                    />
                  </Form.Item>
                  <Form.Item label="採用報價">
                    <Select
                      value={chosenTier}
                      onChange={setChosenTier}
                      options={[
                        { value: 'cost', label: '成本價' },
                        { value: 'standard', label: '標準報價' },
                        { value: 'high_margin', label: '高毛利報價' },
                        { value: 'custom', label: '自訂價格' },
                      ]}
                    />
                  </Form.Item>
                  {chosenTier === 'custom' && (
                    <Form.Item label="自訂報價 ($)">
                      <InputNumber style={{ width: '100%' }} min={0} value={customPrice} onChange={(v) => setCustomPrice(v ?? undefined)} />
                    </Form.Item>
                  )}
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Button onClick={() => setStep(2)}>上一步</Button>
                    <Button type="primary" loading={submitting} onClick={onSubmitQuotation} disabled={!result}>
                      確認報價
                    </Button>
                  </Space>
                </Form>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card variant="borderless" title="即時試算" loading={calculating}>
              {calcError && <Tag color="red">{calcError}</Tag>}
              {!result && !calcError && <p style={{ color: 'rgba(0,0,0,0.45)' }}>請先選擇粉料並輸入數量</p>}
              {result && (
                <>
                  <Space orientation="vertical" style={{ width: '100%' }} size={4}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>粉料成本</span>
                      <span>${Math.round(result.breakdown.materialCost).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>人工成本</span>
                      <span>${Math.round(result.breakdown.laborCost).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>瓦斯成本</span>
                      <span>${Math.round(result.breakdown.gasCost).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>電費</span>
                      <span>${Math.round(result.breakdown.electricityCost).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>水費</span>
                      <span>${Math.round(result.breakdown.waterCost).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>包材成本</span>
                      <span>${Math.round(result.breakdown.packagingCost).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>其他（前處理/外包/損耗）</span>
                      <span>
                        $
                        {Math.round(
                          result.breakdown.pretreatmentCost + result.breakdown.outsourcingCost + result.breakdown.wastageCost,
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>設備/廠房/管理分攤</span>
                      <span>${Math.round(result.breakdown.indirectCostTotal).toLocaleString()}</span>
                    </div>
                  </Space>
                  <Divider style={{ margin: '12px 0' }} />
                  <Statistic title="總成本" value={Math.round(result.breakdown.totalCost)} prefix="$" />

                  <Row gutter={12} style={{ marginTop: 16 }}>
                    {(['cost', 'standard', 'high_margin'] as const).map((tier) => (
                      <Col span={8} key={tier}>
                        <Card size="small" variant="borderless" style={{ background: '#fafafa', textAlign: 'center' }}>
                          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                            {tier === 'cost' ? '成本價' : tier === 'standard' ? '標準報價' : '高毛利報價'}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 600 }}>${Math.round(result.suggestion.tiers[tier].price).toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>毛利率 {result.suggestion.tiers[tier].marginRatePercent.toFixed(1)}%</div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  {selectedMaterial && (
                    <p style={{ marginTop: 12, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      粉料單價：${selectedMaterial.currentPricePerKg}/kg
                    </p>
                  )}
                </>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </section>
  );
}

'use client';

import { Card, Col, Form, InputNumber, Row, Tag } from 'antd';
import styled from 'styled-components';
import { calculateCai, FaceCounts } from '@/lib/pricing/area-formula';

export interface FormulaTemplate {
  _id: string;
  name: string;
  code: string;
  lwFaces: number;
  lhFaces: number;
  whFaces: number;
  isActive: boolean;
}

export interface DimensionState {
  length?: number;
  width?: number;
  height?: number;
}

export const CUSTOM_TEMPLATE_VALUE = '__custom__';

const FACE_FIELDS: { key: keyof FaceCounts; label: string }[] = [
  { key: 'lwFaces', label: '長 × 寬（前後）' },
  { key: 'lhFaces', label: '長 × 高（左右）' },
  { key: 'whFaces', label: '寬 × 高（上下）' },
];

/**
 * 快速報價與精算報價共用的「尺寸 → 面數公式 → 才數」輸入區塊。
 * 面數公式一律來自後台的「才數公式範本」，選擇後自動帶入三個方向的面數，
 * 但三個面數仍可手動修改（修改後會即時反映在公式代碼與才數上）。
 */
export default function DimensionFaceFields({
  dimensions,
  onDimensionsChange,
  faces,
  onFacesChange,
  templates,
  selectedTemplateId,
  onSelectTemplate,
}: {
  dimensions: DimensionState;
  onDimensionsChange: (next: DimensionState) => void;
  faces: FaceCounts;
  onFacesChange: (next: FaceCounts) => void;
  templates: FormulaTemplate[];
  selectedTemplateId?: string;
  onSelectTemplate: (templateId: string) => void;
}) {
  const cai = calculateCai(dimensions, faces);

  return (
    <>
      <Card size="small" title="工件尺寸 (cm)" variant="borderless" style={{ marginBottom: 12 }}>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="長" style={{ marginBottom: 0 }}>
              <InputNumber
                size="large"
                inputMode="decimal"
                style={{ width: '100%' }}
                min={0}
                value={dimensions.length}
                onChange={(v) => onDimensionsChange({ ...dimensions, length: v ?? undefined })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="寬" style={{ marginBottom: 0 }}>
              <InputNumber
                size="large"
                inputMode="decimal"
                style={{ width: '100%' }}
                min={0}
                value={dimensions.width}
                onChange={(v) => onDimensionsChange({ ...dimensions, width: v ?? undefined })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="高" style={{ marginBottom: 0 }}>
              <InputNumber
                size="large"
                inputMode="decimal"
                style={{ width: '100%' }}
                min={0}
                value={dimensions.height}
                onChange={(v) => onDimensionsChange({ ...dimensions, height: v ?? undefined })}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="面數公式" variant="borderless" style={{ marginBottom: 12 }}>
        <FormulaGrid>
          {templates.map((template) => (
            <button
              key={template._id}
              type="button"
              className={selectedTemplateId === template._id ? 'is-active' : ''}
              onClick={() => onSelectTemplate(template._id)}
            >
              <span className="code">{template.code}</span>
              <span className="name">{template.name}</span>
            </button>
          ))}
          <button
            type="button"
            className={selectedTemplateId === CUSTOM_TEMPLATE_VALUE ? 'is-active' : ''}
            onClick={() => onSelectTemplate(CUSTOM_TEMPLATE_VALUE)}
          >
            <span className="code">自訂</span>
            <span className="name">手動輸入面數</span>
          </button>
        </FormulaGrid>

        {templates.length === 0 && (
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 8 }}>
            尚未建立面數公式範本，可先用「自訂」手動輸入面數，或到「成本管理 → 才數公式範本」新增常用公式。
          </p>
        )}

        <Row gutter={12} style={{ marginTop: 12 }}>
          {FACE_FIELDS.map((field) => (
            <Col xs={8} key={field.key}>
              <Form.Item label={field.label} style={{ marginBottom: 0 }}>
                <InputNumber
                  size="large"
                  inputMode="numeric"
                  style={{ width: '100%' }}
                  min={0}
                  max={2}
                  value={faces[field.key]}
                  onChange={(v) => onFacesChange({ ...faces, [field.key]: v ?? 0 })}
                />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Card>

      <CaiCard>
        <div className="row">
          <span className="label">公式</span>
          <Tag color="blue">{cai.formulaCode}</Tag>
        </div>
        <div className="row">
          <span className="label">總面積</span>
          <span>{cai.totalAreaCm2.toLocaleString(undefined, { maximumFractionDigits: 1 })} cm²</span>
        </div>
        <div className="row highlight">
          <span className="label">計算才數</span>
          <strong>{cai.caiCount.toLocaleString(undefined, { maximumFractionDigits: 2 })} 才</strong>
        </div>
        <p className="hint">1 才 = 900 cm²（本廠的「才」已是雙面才，不再另外 ×2）</p>
      </CaiCard>
    </>
  );
}

const FormulaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 8px;

  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s;

    .code {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-color);
    }

    .name {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.55);
      text-align: center;
    }

    &.is-active {
      border-color: var(--primary-color);
      background: var(--accent-color);
    }
  }
`;

const CaiCard = styled.div`
  background: var(--accent-color);
  border-radius: 12px;
  padding: 14px 16px;

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }

  .label {
    color: rgba(0, 0, 0, 0.55);
  }

  .highlight {
    font-size: 20px;
    border-top: 1px dashed rgba(0, 0, 0, 0.15);
    margin-top: 4px;
    padding-top: 8px;

    strong {
      color: var(--primary-color);
    }
  }

  .hint {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
`;

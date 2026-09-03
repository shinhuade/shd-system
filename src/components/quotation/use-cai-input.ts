'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaceCounts } from '@/lib/pricing/area-formula';
import { CUSTOM_TEMPLATE_VALUE, DimensionState, FormulaTemplate } from './dimension-face-fields';

/**
 * 快速報價與精算報價共用的輸入狀態：工件尺寸、面數公式範本、三個方向的面數。
 * 範本清單來自後台「才數公式範本」，未來新增 111 / 121 / 101 等公式不需要改前端。
 */
export function useCaiInput() {
  const [templates, setTemplates] = useState<FormulaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [dimensions, setDimensions] = useState<DimensionState>({});
  const [faces, setFaces] = useState<FaceCounts>({ lwFaces: 0, lhFaces: 0, whFaces: 0 });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/workpiece-formula-templates');
        const result = await res.json();
        if (!mounted) return;
        setTemplates((result?.data || []).filter((t: FormulaTemplate) => t.isActive));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setTemplatesLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const selectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (templateId === CUSTOM_TEMPLATE_VALUE) return;
      setTemplates((current) => {
        const template = current.find((t) => t._id === templateId);
        if (template) {
          setFaces({ lwFaces: template.lwFaces, lhFaces: template.lhFaces, whFaces: template.whFaces });
        }
        return current;
      });
    },
    [],
  );

  /** 手動調整面數後，選取狀態切換為「自訂」，避免顯示與實際面數不一致 */
  const updateFaces = useCallback(
    (next: FaceCounts) => {
      setFaces(next);
      setSelectedTemplateId((currentId) => {
        if (!currentId || currentId === CUSTOM_TEMPLATE_VALUE) return currentId;
        const template = templates.find((t) => t._id === currentId);
        const matchesTemplate =
          template &&
          template.lwFaces === next.lwFaces &&
          template.lhFaces === next.lhFaces &&
          template.whFaces === next.whFaces;
        return matchesTemplate ? currentId : CUSTOM_TEMPLATE_VALUE;
      });
    },
    [templates],
  );

  const hasFaces = faces.lwFaces + faces.lhFaces + faces.whFaces > 0;
  const hasDimensions = Boolean(dimensions.length && dimensions.width) || Boolean(dimensions.length && dimensions.height);

  return {
    templates,
    templatesLoading,
    dimensions,
    setDimensions,
    faces,
    setFaces: updateFaces,
    selectedTemplateId,
    selectTemplate,
    hasFaces,
    hasDimensions,
    /** 送給 API 用的面數欄位 */
    facePayload: { lwFaces: faces.lwFaces, lhFaces: faces.lhFaces, whFaces: faces.whFaces },
    formulaTemplateId: selectedTemplateId === CUSTOM_TEMPLATE_VALUE ? undefined : selectedTemplateId,
  };
}

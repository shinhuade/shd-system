'use client';

import { Tabs } from 'antd';
import PageHeader from '@/components/page-header';
import RateListPanel from '@/components/cost-management/rate-list-panel';
import ProcessingParamsPanel from '@/components/cost-management/processing-params-panel';
import MonthlyCostRecordForm from '@/components/cost-management/monthly-cost-record-form';
import WorkpieceFormulaPanel from '@/components/cost-management/workpiece-formula-panel';
import { FIXED_COST_CATEGORIES } from '@/models/schemas/fixed-cost';

const FIXED_COST_CATEGORY_LABELS: Record<string, string> = {
  rent: '廠房租金',
  depreciation: '設備折舊',
  maintenance: '維修',
  management_staff: '管理人員',
  admin: '行政費',
  insurance: '保險',
  other: '其他固定成本',
};

export default function CostManagementPage() {
  return (
    <section>
      <PageHeader title="成本管理" description="人工、固定成本、加工參數與每月實際成本登錄，皆保留完整歷史版本" />

      <Tabs
        items={[
          {
            key: 'labor',
            label: '人工成本',
            children: (
              <RateListPanel
                basePath="/api/admin/labor-rates"
                nameField="label"
                nameLabel="名稱"
                valueField="currentHourlyRate"
                valueLabel="每小時人工成本"
                versionValueField="hourlyRate"
                unitSuffix="/小時"
                createFields={[{ name: 'label', label: '名稱', type: 'text' }]}
              />
            ),
          },
          {
            key: 'fixed',
            label: '固定成本',
            children: (
              <RateListPanel
                basePath="/api/admin/fixed-costs"
                nameField="label"
                nameLabel="名稱"
                valueField="currentMonthlyAmount"
                valueLabel="每月金額"
                versionValueField="monthlyAmount"
                unitSuffix="/月"
                createFields={[
                  {
                    name: 'category',
                    label: '類別',
                    type: 'select',
                    options: FIXED_COST_CATEGORIES.map((c) => ({ value: c, label: FIXED_COST_CATEGORY_LABELS[c] })),
                  },
                  { name: 'label', label: '名稱', type: 'text' },
                ]}
              />
            ),
          },
          { key: 'processing-params', label: '加工參數設定', children: <ProcessingParamsPanel /> },
          { key: 'formula-templates', label: '才數公式範本', children: <WorkpieceFormulaPanel /> },
          { key: 'monthly-records', label: '本月成本登錄', children: <MonthlyCostRecordForm /> },
        ]}
      />
    </section>
  );
}

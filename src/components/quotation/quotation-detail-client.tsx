'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, Descriptions, Row, Statistic, Tag } from 'antd';
import PageHeader from '@/components/page-header';
import ResponsiveTable from '@/components/responsive-table';
import { ArrowLeft, ArrowsRotate } from '@styled-icons/fa-solid';
import dayjs from 'dayjs';

interface QuotationItem {
  _id: string;
  workpieceName: string;
  quantity: number;
  formulaCode?: string;
  caiCount?: number;
  costBreakdown: { totalCost: number };
  chosenPrice: number;
  marginRatePercent: number;
}

interface Quotation {
  _id: string;
  quotationNo: string;
  quotationDate: string;
  status: string;
  customerId?: { name: string };
  totalCostPrice: number;
  chosenPrice: number;
  marginAmount: number;
  marginRatePercent: number;
}

interface RequoteResult {
  quotationItemId: string;
  workpieceName: string;
  originalTotalCost: number;
  currentTotalCost: number;
  percentChange: number;
  marginRateIfUnchanged: number;
  suggestedNewPrice: number;
  severity: 'red' | 'orange' | 'yellow' | 'green';
}

const SEVERITY_META: Record<string, { emoji: string; color: string; label: string }> = {
  red: { emoji: '🔴', color: 'red', label: '成本異常增加' },
  orange: { emoji: '🟠', color: 'orange', label: '毛利率下降' },
  yellow: { emoji: '🟡', color: 'gold', label: '建議重新報價' },
  green: { emoji: '🟢', color: 'green', label: '成本穩定' },
};

export default function QuotationDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requoteResults, setRequoteResults] = useState<RequoteResult[] | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/quotes/${id}`);
        const result = await res.json();
        if (!mounted) return;
        setQuotation(result?.data?.quotation || null);
        setItems(result?.data?.items || []);
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
  }, [id]);

  const onRequoteCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}/requote-check`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || '檢查失敗');
      setRequoteResults(result.data);
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <section>
      <Button type="text" icon={<ArrowLeft size={14} />} onClick={() => router.push('/admin/quotes')} style={{ marginBottom: 12, paddingLeft: 0 }}>
        返回報價紀錄
      </Button>

      {quotation && (
        <>
          <PageHeader
            title={quotation.quotationNo}
            description={quotation.customerId?.name || '未知客戶'}
            extra={
              <Button icon={<ArrowsRotate size={14} />} loading={checking} onClick={onRequoteCheck}>
                重新檢查是否該漲價
              </Button>
            }
          />

          <Card variant="borderless" loading={loading} style={{ marginBottom: 16 }}>
            <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
              <Descriptions.Item label="日期">{dayjs(quotation.quotationDate).format('YYYY-MM-DD')}</Descriptions.Item>
              <Descriptions.Item label="狀態">
                <Tag color={quotation.status === 'final' ? 'green' : 'default'}>{quotation.status === 'final' ? '正式' : '草稿'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="總成本">${Math.round(quotation.totalCostPrice).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="報價">${Math.round(quotation.chosenPrice).toLocaleString()}</Descriptions.Item>
            </Descriptions>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Statistic title="毛利金額" value={Math.round(quotation.marginAmount)} prefix="$" />
              </Col>
              <Col span={12}>
                <Statistic title="毛利率" value={quotation.marginRatePercent} precision={1} suffix="%" />
              </Col>
            </Row>
          </Card>

          <Card variant="borderless" title="工件明細" style={{ marginBottom: 16 }}>
            <ResponsiveTable<QuotationItem>
              rowKey="_id"
              dataSource={items}
              pagination={false}
              emptyText="這張報價單沒有工件明細"
              columns={[
                { title: '工件名稱', dataIndex: 'workpieceName', key: 'workpieceName', mobilePrimary: true },
                { title: '數量', dataIndex: 'quantity', key: 'quantity' },
                { title: '公式', dataIndex: 'formulaCode', key: 'formulaCode', render: (v?: string) => (v ? <Tag color="blue">{v}</Tag> : '-') },
                { title: '才數', dataIndex: 'caiCount', key: 'caiCount', render: (v?: number) => (v != null ? `${v.toFixed(2)} 才` : '-') },
                { title: '成本', dataIndex: ['costBreakdown', 'totalCost'], key: 'cost', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
                { title: '報價', dataIndex: 'chosenPrice', key: 'chosenPrice', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
                { title: '毛利率', dataIndex: 'marginRatePercent', key: 'marginRatePercent', render: (v: number) => `${v.toFixed(1)}%` },
              ]}
            />
          </Card>

          {requoteResults && (
            <Card variant="borderless" title="漲價提醒檢查結果">
              <ResponsiveTable<RequoteResult>
                rowKey="quotationItemId"
                dataSource={requoteResults}
                pagination={false}
                columns={[
                  { title: '工件名稱', dataIndex: 'workpieceName', key: 'workpieceName', mobilePrimary: true },
                  {
                    title: '狀態',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (v: RequoteResult['severity']) => (
                      <Tag color={SEVERITY_META[v].color}>
                        {SEVERITY_META[v].emoji} {SEVERITY_META[v].label}
                      </Tag>
                    ),
                  },
                  { title: '原成本', dataIndex: 'originalTotalCost', key: 'originalTotalCost', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
                  { title: '目前成本', dataIndex: 'currentTotalCost', key: 'currentTotalCost', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
                  { title: '成本變動', dataIndex: 'percentChange', key: 'percentChange', render: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` },
                  { title: '若維持原報價，目前毛利率', dataIndex: 'marginRateIfUnchanged', key: 'marginRateIfUnchanged', render: (v: number) => `${v.toFixed(1)}%` },
                  { title: '建議新報價', dataIndex: 'suggestedNewPrice', key: 'suggestedNewPrice', render: (v: number) => `$${Math.round(v).toLocaleString()}` },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </section>
  );
}

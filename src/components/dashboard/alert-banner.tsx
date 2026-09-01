'use client';

import { Card, Button, Empty, Tag, Space, Typography } from 'antd';
import { ArrowsRotate } from '@styled-icons/fa-solid';

const { Text } = Typography;

export interface AlertItem {
  _id: string;
  type: string;
  workpieceName?: string;
  quotationId?: string;
  percentChange: number;
  currentMarginRateIfUnchanged: number;
  suggestedNewPrice: number;
  severity: 'red' | 'orange' | 'yellow' | 'green';
}

const SEVERITY_META: Record<string, { emoji: string; color: string; label: string }> = {
  red: { emoji: '🔴', color: 'red', label: '成本異常增加' },
  orange: { emoji: '🟠', color: 'orange', label: '毛利率下降' },
  yellow: { emoji: '🟡', color: 'gold', label: '建議重新報價' },
  green: { emoji: '🟢', color: 'green', label: '成本穩定' },
};

export default function AlertBanner({
  alerts,
  loading,
  refreshing,
  onRefresh,
  onAcknowledge,
  onDismiss,
}: {
  alerts: AlertItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <Card
      variant="borderless"
      title="漲價提醒"
      extra={
        <Button size="small" icon={<ArrowsRotate size={14} />} loading={refreshing} onClick={onRefresh}>
          重新檢查
        </Button>
      }
      loading={loading}
    >
      {alerts.length === 0 ? (
        <Empty description="🟢 目前沒有需要留意的成本異常" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          {alerts.map((alert) => {
            const meta = SEVERITY_META[alert.severity];
            return (
              <Card key={alert._id} size="small" variant="borderless" style={{ background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <Tag color={meta.color}>
                      {meta.emoji} {meta.label}
                    </Tag>
                    <Text strong style={{ marginLeft: 8 }}>
                      {alert.workpieceName || '(未知工件)'}
                    </Text>
                    <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>
                      成本變動 {alert.percentChange >= 0 ? '+' : ''}
                      {alert.percentChange.toFixed(1)}%，若維持原報價目前毛利率約 {alert.currentMarginRateIfUnchanged.toFixed(1)}%，
                      建議新報價 ${Math.round(alert.suggestedNewPrice).toLocaleString()}
                    </div>
                  </div>
                  <Space>
                    <Button size="small" onClick={() => onAcknowledge(alert._id)}>
                      已知悉
                    </Button>
                    <Button size="small" onClick={() => onDismiss(alert._id)}>
                      忽略
                    </Button>
                  </Space>
                </div>
              </Card>
            );
          })}
        </Space>
      )}
    </Card>
  );
}

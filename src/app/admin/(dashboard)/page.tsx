'use client';

import { useCallback, useEffect, useState } from 'react';
import { Row, Col, App } from 'antd';
import PageHeader from '@/components/page-header';
import SummaryCards, { DashboardSummary } from '@/components/dashboard/summary-cards';
import AlertBanner, { AlertItem } from '@/components/dashboard/alert-banner';
import CostBreakdownChart from '@/components/dashboard/cost-breakdown-chart';
import CostTrendPanel from '@/components/charts/cost-trend-panel';

export default function Dashboard() {
  const { message } = App.useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard/summary');
      const result = await res.json();
      setSummary(result?.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch('/api/admin/alerts?status=open');
      const result = await res.json();
      setAlerts(result?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch('/api/admin/alerts/refresh', { method: 'POST' });
      await Promise.all([loadAlerts(), loadSummary()]);
    } catch (err) {
      console.error(err);
      message.error('重新檢查失敗');
    } finally {
      setRefreshing(false);
    }
  }, [loadAlerts, loadSummary, message]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await fetch('/api/admin/alerts/refresh', { method: 'POST' });
        const [summaryRes, alertsRes] = await Promise.all([
          fetch('/api/admin/dashboard/summary'),
          fetch('/api/admin/alerts?status=open'),
        ]);
        const [summaryResult, alertsResult] = await Promise.all([summaryRes.json(), alertsRes.json()]);
        if (!mounted) return;
        setSummary(summaryResult?.data || null);
        setAlerts(alertsResult?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) {
          setSummaryLoading(false);
          setAlertsLoading(false);
          setRefreshing(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const updateAlertStatus = async (id: string, status: 'acknowledged' | 'dismissed') => {
    try {
      await fetch(`/api/admin/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error(err);
      message.error('操作失敗');
    }
  };

  return (
    <section>
      <PageHeader title="Dashboard" description="掌握本月營收、成本與毛利，隨時知道該不該重新報價" />

      <SummaryCards summary={summary} loading={summaryLoading} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <AlertBanner
            alerts={alerts}
            loading={alertsLoading}
            refreshing={refreshing}
            onRefresh={refreshAlerts}
            onAcknowledge={(id) => updateAlertStatus(id, 'acknowledged')}
            onDismiss={(id) => updateAlertStatus(id, 'dismissed')}
          />
        </Col>
        <Col xs={24} lg={10}>
          <CostBreakdownChart costByCategory={summary?.costByCategory || {}} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <CostTrendPanel title="本月毛利率趨勢" metric="margin_rate" valueSuffix="%" />
        </Col>
        <Col xs={24} lg={12}>
          <CostTrendPanel title="粉料成本趨勢" metric="material_cost" />
        </Col>
      </Row>
    </section>
  );
}

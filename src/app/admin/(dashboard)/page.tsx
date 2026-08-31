'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Skeleton } from 'antd';

interface DashboardCounts {
  userTotal: number;
  adminTotal: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<DashboardCounts>({ userTotal: 0, adminTotal: 0 });

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        const [userRes, adminRes] = await Promise.all([
          fetch('/api/generic/user?page=1&limit=1', { method: 'GET' }),
          fetch('/api/generic/admin?page=1&limit=1', { method: 'GET' }),
        ]);

        const userResult = await userRes.json().catch(() => null);
        const adminResult = await adminRes.json().catch(() => null);

        if (!mounted) return;

        setCounts({
          userTotal: Number(userResult?.total || 0),
          adminTotal: Number(adminResult?.total || 0),
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>後台儀表板</h1>
        <p style={{ color: 'rgba(0,0,0,0.45)' }}>快速掌握系統狀態與常用管理操作</p>
      </div>

      <Row gutter={[16, 16]}>
        {/* <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless">
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic title="會員總數" value={counts.userTotal} />
            )}
          </Card>
        </Col> */}

        <Col xs={24} sm={12} lg={8}>
          <Card variant="borderless">
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic title="管理員帳號" value={counts.adminTotal} />
            )}
          </Card>
        </Col>
      </Row>
    </section>
  );
}

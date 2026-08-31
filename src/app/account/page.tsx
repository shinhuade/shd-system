import { Card } from 'antd';

export default function Account() {
  return (
    <section>
      <h1 style={{ marginBottom: 16 }}>歡迎回來</h1>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <Card title="個人資料" variant="borderless">
          查看與更新會員資料。
        </Card>
        <Card title="帳號安全" variant="borderless">
          管理密碼與登入安全設定。
        </Card>
      </div>
    </section>
  );
}

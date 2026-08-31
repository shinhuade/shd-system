import AccountShell from '@/components/account-shell';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="has-header">
      <div className="container">
        <AccountShell>{children}</AccountShell>
      </div>
    </main>
  );
}

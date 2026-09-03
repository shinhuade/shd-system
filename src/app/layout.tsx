import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import StyledComponentsRegistry from '@/lib/styled-components-registry';
import theme from '@/styles/theme';
import LayoutShell from '@/components/layout-shell';

export const metadata: Metadata = {
  title: '興樺德',
  description: '興樺德系統',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: theme.colors.primary,
                colorTextSecondary: theme.colors.secondary,
                colorBorderSecondary: theme.colors.accent,
                colorFillSecondary: theme.colors.accent,
                colorBgLayout: theme.colors.accent,
                colorLink: 'inherit',
              },
              components: {
                Layout: {
                  siderBg: '#fff',
                  bodyBg: theme.colors.accent,
                },
                Button: {
                  colorLinkHover: theme.colors.primary,
                  colorLinkActive: theme.colors.primary,
                  controlOutline: 'none',
                },
              },
            }}
          >
            <AntdApp>
              <StyledComponentsRegistry>
                <LayoutShell>{children}</LayoutShell>
              </StyledComponentsRegistry>
            </AntdApp>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

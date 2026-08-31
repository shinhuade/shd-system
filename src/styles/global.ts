'use client';

import { css, createGlobalStyle } from 'styled-components';
import theme from './theme';

const style = css`
  :root {
    --primary-color: ${theme.colors.primary};
    --navbar-height: 80px;
    --base-padding: 16px;
    -webkit-tap-highlight-color: transparent;
  }

  .ant-app {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .completely-hidden-field {
    display: none !important;
  }
`;

export const GlobalStyle = createGlobalStyle`
  ${style}
`;

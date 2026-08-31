import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['@rjsf/antd', '@rjsf/core', '@rjsf/utils', '@rjsf/validator-ajv8', 'antd-img-crop'],
};

export default nextConfig;

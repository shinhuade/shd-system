import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

export const getApiDocs = () => {
  const spec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Next.js API Docs',
        version: '1.0.0',
        description: 'API 文件說明',
      },
      // components: {
      //   securitySchemes: {
      //     BearerAuth: {
      //       type: 'http',
      //       scheme: 'bearer',
      //       bearerFormat: 'JWT',
      //     },
      //   },
      // },
    },
    // 使用絕對路徑，避免執行目錄不同造成掃描不到註解
    apis: [path.join(process.cwd(), 'src/app/api/**/*.ts')],
  });
  return spec;
};

// lib/model-map.ts
import { Model } from 'mongoose';
import User from '@/models/user';
import Admin from '@/models/admin';
import Customer from '@/models/customer';
import Quotation from '@/models/quotation';

// 定義 Mapping 物件，對應 URL 上的 slug
export const modelMap: Record<string, Model<unknown>> = {
  user: User,
  admin: Admin,
  customer: Customer,
  // 僅供 /api/generic/quotation 的唯讀瀏覽（列表/搜尋/詳情）使用；
  // 建立與計算一律走 /api/admin/quotes，不透過通用 create/PATCH。
  quotation: Quotation,
};

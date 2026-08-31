// lib/model-map.ts
import { Model } from 'mongoose';
import User from '@/models/user';
import Admin from '@/models/admin';

// 定義 Mapping 物件，對應 URL 上的 slug
export const modelMap: Record<string, Model<unknown>> = {
  user: User,
  admin: Admin,
};

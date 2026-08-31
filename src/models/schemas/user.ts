import { z } from 'zod';

export const UserSchema = z
  .object({
    username: z
      .string({ message: '帳號必填' })
      .min(3, { message: '帳號至少需要 3 個字元' })
      .max(20, { message: '帳號不能超過 20 個字元' })
      .trim()
      .regex(/^[a-zA-Z0-9]+$/, { message: '帳號只能包含英文和數字' }),
    password: z
      .string({ message: '密碼必填' })
      .min(6, { message: '密碼至少需要 6 個字元' })
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/, { message: '密碼必須包含英文字母與數字' }),
    confirmPassword: z.string(),
    name: z.string({ message: '名稱必填' }).max(20, { message: '帳號不能超過 20 個字元' }).trim(),
    email: z.string().email({ message: 'Email 格式不正確' }).min(1, '請提供 Email'),
    avatar: z.string().url({ message: '頭像必須是有效的 URL' }).optional(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmPassword'],
  });

export type UserInput = z.infer<typeof UserSchema>;

export const LoginSchema = z.object({
  username: z
    .string({ message: '帳號必填' })
    .min(3, { message: '帳號至少需要 3 個字元' })
    .max(20, { message: '帳號不能超過 20 個字元' })
    .trim(),
  password: z.string({ message: '密碼必填' }).min(6, { message: '密碼至少需要 6 個字元' }),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().max(20, { message: '名稱不能超過 20 個字元' }).optional(),
    email: z.string().email({ message: 'Email 格式不正確' }).optional(),
    avatar: z.string().optional(),
  })
  .strict();

export type profileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string({ message: '請輸入目前密碼' }).min(1, { message: '請輸入目前密碼' }),
    newPassword: z
      .string({ message: '請輸入新密碼' })
      .min(6, { message: '密碼至少需要 6 個字元' })
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/, { message: '密碼必須包含英文字母與數字' }),
    confirmPassword: z.string({ message: '請再次輸入新密碼' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmPassword'],
  });

export type passwordUpdateInput = z.infer<typeof passwordUpdateSchema>;

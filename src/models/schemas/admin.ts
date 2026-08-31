import { z } from 'zod';

export const AdminSchema = z
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
  })
  .strict();

export type AdminInput = z.infer<typeof AdminSchema>;

export const LoginSchema = z.object({
  username: z
    .string({ message: '帳號必填' })
    .min(3, { message: '帳號至少需要 3 個字元' })
    .max(20, { message: '帳號不能超過 20 個字元' })
    .trim(),
  password: z.string({ message: '密碼必填' }).min(6, { message: '密碼至少需要 6 個字元' }),
});
export type LoginInput = z.infer<typeof LoginSchema>;

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

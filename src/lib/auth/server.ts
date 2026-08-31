import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 基礎權限檢查：取得 User 資訊並驗證登入狀態 (401)
 */
export async function getAuthSession() {
  const headerList = await headers();
  const userId = headerList.get('x-user-id');
  const userRole = headerList.get('x-user-role');

  if (!userId) {
    return {
      isValid: false,
      response: NextResponse.json({ message: '登入已失效，請重新登入' }, { status: 401 }),
    };
  }

  return { isValid: true, userId, userRole };
}

/**
 * 嚴格檢查 Admin 權限 (403)
 */
export async function validateAdmin() {
  const auth = await getAuthSession();

  // 如果基礎驗證（登入狀態）就不通過，直接回傳
  if (!auth.isValid) return auth;

  // 檢查是否為管理員
  if (auth.userRole !== 'admin') {
    return {
      isValid: false,
      response: NextResponse.json({ message: '無權限存取' }, { status: 403 }),
    };
  }

  return auth;
}

# COLLECTION

本文件整理目前專案的資料集合（collection）與欄位規格，供後台 generic CRUD 與 API 開發參考。

## 1) Collection 對照

來源: `src/lib/model-map.ts`

| collection slug | mongoose model |
| --------------- | -------------- |
| `user`          | `User`         |
| `admin`         | `Admin`        |

`/api/generic/{collection}`、`/api/generic/{collection}/create`、`/api/generic/{collection}/{id}` 僅支援上述 slug。

## 2) MongoDB Schema 結構

### `admin` collection

來源: `src/models/admin.ts`

| 欄位       | 型別     | 必填 | 唯一 | 備註                                                  |
| ---------- | -------- | ---- | ---- | ----------------------------------------------------- |
| `username` | `string` | 是   | 是   | 管理員帳號                                            |
| `password` | `string` | 是   | 否   | 預設查詢不回傳（`select: false`），儲存前 bcrypt 雜湊 |

額外行為:

- instance method: `comparePassword(candidatePassword)`
- instance method: `createAccessToken()`
- instance method: `createRefreshToken()`

### `user` collection

來源: `src/models/user.ts`

| 欄位       | 型別     | 必填 | 唯一 | 備註                                                  |
| ---------- | -------- | ---- | ---- | ----------------------------------------------------- |
| `username` | `string` | 是   | 是   | 會員帳號                                              |
| `password` | `string` | 是   | 否   | 預設查詢不回傳（`select: false`），儲存前 bcrypt 雜湊 |
| `name`     | `string` | 是   | 否   | 顯示名稱                                              |
| `avatar`   | `string` | 否   | 否   | 頭像 URL（可為 Cloudinary）                           |
| `email`    | `string` | 是   | 是   | Email                                                 |

額外行為:

- instance method: `comparePassword(candidatePassword)`
- instance method: `createAccessToken()`
- instance method: `createRefreshToken()`

## 3) API 請求驗證結構（Zod）

### Admin

來源: `src/models/schemas/admin.ts`

- `AdminSchema`（管理員註冊）
  - `username`: 3-20 字元、英數
  - `password`: 至少 6 字元，需含英文字母與數字
- `LoginSchema`（管理員登入）
  - `username`, `password`
- `passwordUpdateSchema`（管理員改密碼）
  - `currentPassword`, `newPassword`, `confirmPassword`
  - `newPassword` 與 `confirmPassword` 必須一致

### User

來源: `src/models/schemas/user.ts`

- `UserSchema`（會員註冊）
  - `username`, `password`, `confirmPassword`, `name`, `email` 必填
  - `avatar` 選填（URL）
  - `password` 與 `confirmPassword` 必須一致
- `LoginSchema`（會員登入）
  - `username`, `password`
- `profileUpdateSchema`（會員資料更新）
  - `name`, `email`, `avatar` 皆選填
- `passwordUpdateSchema`（會員改密碼）
  - `currentPassword`, `newPassword`, `confirmPassword`
  - `newPassword` 與 `confirmPassword` 必須一致

## 4) Generic Admin 設定檔（後台 UI）

來源:

- `src/configs/admin/user.json`
- `src/configs/admin/admin-user.json`

### user 設定重點

- `searchFields`: `name`, `email`
- 列表欄位: `avatar`, `name`, `email`
- 排序: `-createdAt`, `createdAt`
- 表單欄位: `username`, `password`, `confirmPassword`, `avatar`, `name`, `email`

### admin 設定重點

- `searchFields`: `username`
- 列表欄位: `username`, `name`
- 排序: `-createdAt`, `createdAt`
- 表單欄位: `username`, `password`, `name`

## 5) Generic API Query 參數

來源: `src/app/api/generic/[collection]/route.ts`

| 參數      | 型別   | 預設值       | 說明                                   |
| --------- | ------ | ------------ | -------------------------------------- |
| `keyword` | string | -            | 搜尋關鍵字                             |
| `fields`  | string | -            | 搜尋欄位，逗號分隔（例: `name,email`） |
| `page`    | number | `1`          | 分頁頁碼                               |
| `limit`   | number | `10`         | 每頁筆數                               |
| `sort`    | string | `-createdAt` | 排序（Mongoose sort 格式）             |

`buildSearchQuery` 會將 `fields` 轉為 `$or + $regex` 條件，大小寫不敏感。

## 6) 注意事項

- `admin` model 目前沒有 `name` 欄位，但 `src/configs/admin/admin-user.json` 的欄位有 `name`。若要在後台顯示/編輯管理員名稱，需同步擴充 admin schema 與驗證。
- generic API 對 body 採動態欄位寫入，型別與欄位限制主要由各 model schema（Mongoose）與上層 UI/呼叫端控制。

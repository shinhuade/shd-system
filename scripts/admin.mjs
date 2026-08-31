import nextEnv from '@next/env';
import readline from 'readline';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.plugin((schema) => {
  schema.set('timestamps', true);
  schema.set('versionKey', false);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('資料庫連線成功\n');
  } catch (error) {
    console.error('資料庫連線失敗:', error.message || error);
    process.exit(1);
  }
}

async function listAdmins() {
  const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();

  if (admins.length === 0) {
    console.log('目前沒有任何 admin 帳號。\n');
    return;
  }

  console.log('\n--- Admin 帳號列表 ---');
  admins.forEach((admin, idx) => {
    console.log(`[${idx + 1}] ID: ${admin._id}`);
    console.log(`    Username: ${admin.username}`);
    console.log(`    建立時間: ${admin.createdAt ? new Date(admin.createdAt).toLocaleString('zh-TW') : 'N/A'}`);
  });
  console.log('---------------------\n');
}

async function createAdmin() {
  console.log('\n--- 建立 Admin 帳號 ---');
  const username = (await question('Username: ')).trim();
  const password = (await question('Password (至少 6 個字元): ')).trim();

  if (!username || !password) {
    console.log('所有欄位均為必填\n');
    return;
  }

  if (password.length < 6) {
    console.log('密碼至少需要 6 個字元\n');
    return;
  }

  const exists = await Admin.findOne({ username });

  if (exists) {
    console.log('Username 已存在\n');
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await Admin.create({ username, password: passwordHash });
    console.log(`Admin 帳號已建立: ${created.username} (ID: ${created._id})\n`);
  } catch (error) {
    console.error('建立失敗:', error.message || error);
  }
}

async function updateAdmin() {
  console.log('\n--- 更新 Admin 帳號 ---');
  const username = (await question('請輸入要更新的 Username: ')).trim();

  if (!username) {
    console.log('Username 不可為空\n');
    return;
  }

  const admin = await Admin.findOne({ username });

  if (!admin) {
    console.log(`找不到 Username 為 "${username}" 的 admin\n`);
    return;
  }

  console.log(`找到帳號: ${admin.username} (ID: ${admin._id})`);
  const newUsername = (await question(`新 Username (按 Enter 跳過，目前: ${admin.username}): `)).trim();
  const newPassword = (await question('新密碼 (按 Enter 跳過): ')).trim();

  let isModified = false;

  if (newUsername && newUsername !== admin.username) {
    const existing = await Admin.findOne({ username: newUsername });

    if (existing) {
      console.log(`新 Username "${newUsername}" 已被使用，更新失敗\n`);
      return;
    }

    admin.username = newUsername;
    isModified = true;
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      console.log('密碼至少需要 6 個字元\n');
      return;
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    isModified = true;
  }

  if (!isModified) {
    console.log('沒有任何更新\n');
    return;
  }

  try {
    await admin.save();
    console.log(`Admin 帳號 "${admin.username}" 已更新\n`);
  } catch (error) {
    console.error('更新失敗:', error.message || error);
  }
}

async function deleteAdmin() {
  console.log('\n--- 刪除 Admin 帳號 ---');
  const username = (await question('請輸入要刪除的 Username: ')).trim();

  if (!username) {
    console.log('Username 不可為空\n');
    return;
  }

  const admin = await Admin.findOne({ username });

  if (!admin) {
    console.log(`找不到 Username 為 "${username}" 的 admin\n`);
    return;
  }

  console.log(`即將刪除: ${admin.username} (ID: ${admin._id})`);
  const confirm = (await question('確認刪除? (y/N): ')).trim().toLowerCase();

  if (confirm !== 'y') {
    console.log('已取消刪除\n');
    return;
  }

  try {
    await Admin.findByIdAndDelete(admin._id);
    console.log(`Admin 帳號 "${username}" 已刪除\n`);
  } catch (error) {
    console.error('刪除失敗:', error.message || error);
  }
}

async function menu() {
  while (true) {
    console.log('==============================');
    console.log('      Admin 帳號管理工具');
    console.log('==============================');
    console.log('1. 列出所有 admin 帳號');
    console.log('2. 建立 admin 帳號');
    console.log('3. 更新 admin 帳號');
    console.log('4. 刪除 admin 帳號');
    console.log('0. 離開');

    let choice = '';

    try {
      choice = (await question('請選擇操作 (0-4): ')).trim();
    } catch {
      console.log('\n再見！');
      return;
    }

    try {
      switch (choice) {
        case '1':
          await listAdmins();
          break;
        case '2':
          await createAdmin();
          break;
        case '3':
          await updateAdmin();
          break;
        case '4':
          await deleteAdmin();
          break;
        case '0':
          console.log('再見！');
          rl.close();
          return;
        default:
          console.log('無效的選擇，請重新輸入\n');
      }
    } catch (error) {
      console.error('發生未預期錯誤:', error.message || error);
    }
  }
}

async function main() {
  await connectDB();
  await menu();
}

main()
  .catch((error) => {
    console.error(error.message || error);
    rl.close();
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

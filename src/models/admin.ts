import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { AdminInput } from './schemas/admin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface IAdminMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  createAccessToken(): string;
  createRefreshToken(): string;
}

export interface IAdmin extends AdminInput, Document, IAdminMethods {}

const AdminSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
  },
  commonOptions,
);

AdminSchema.pre('save', async function () {
  // 只有當密碼有被修改過（或新建立）時才加密，避免重複加密
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

AdminSchema.methods.comparePassword = async function (candidatePassword: string) {
  // 注意：若查詢時沒用 .select('+password')，this.password 會是 undefined
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

AdminSchema.methods.createAccessToken = function (this: IAdmin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  const expiresIn = (process.env.ACCESS_EXPIRE || '15m') as jwt.SignOptions['expiresIn'];

  return jwt.sign({ sub: this._id, role: 'admin', type: 'access' }, secret, {
    expiresIn,
  });
};

AdminSchema.methods.createRefreshToken = function (this: IAdmin) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  const expiresIn = (process.env.REFRESH_EXPIRE || '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign({ sub: this._id, role: 'admin', type: 'refresh' }, secret, {
    expiresIn,
  });
};

const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;

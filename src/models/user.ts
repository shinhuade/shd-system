import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { UserInput } from './schemas/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  createAccessToken(): string;
  createRefreshToken(): string;
}

export interface IUser extends UserInput, Document, IUserMethods {}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
    avatar: { type: String },
    email: {
      type: String,
      required: [true, '請提供 Email'],
      unique: true,
    },
  },
  commonOptions,
);

UserSchema.pre('save', async function () {
  // 只有當密碼有被修改過（或新建立）時才加密，避免重複加密
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  // 注意：若查詢時沒用 .select('+password')，this.password 會是 undefined
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.createAccessToken = function (this: IUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  const expiresIn = (process.env.ACCESS_EXPIRE || '15m') as jwt.SignOptions['expiresIn'];

  return jwt.sign({ sub: this._id, role: 'user', type: 'access' }, secret, {
    expiresIn,
  });
};

UserSchema.methods.createRefreshToken = function (this: IUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  const expiresIn = (process.env.REFRESH_EXPIRE || '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign({ sub: this._id, role: 'user', type: 'refresh' }, secret, {
    expiresIn,
  });
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

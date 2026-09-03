import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { CustomerInput } from './schemas/customer';

export interface ICustomer extends CustomerInput, Document {}

const CustomerSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    taxId: { type: String },
    targetMarginRatePercent: { type: Number },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  commonOptions,
);

const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;

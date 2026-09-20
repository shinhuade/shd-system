import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { CustomerInput } from './schemas/customer';

export interface ICustomer extends CustomerInput, Document {}

const CustomerSchema: Schema = new Schema(
  {
    name: { type: String, required: true },

    // 身分旗標：同一家公司可以同時是客戶與廠商，兩種身分各有自己的編號
    isCustomer: { type: Boolean, default: true, index: true },
    isSupplier: { type: Boolean, default: false, index: true },
    customerCode: { type: String },
    supplierCode: { type: String },

    contactPerson: { type: String },
    phone: { type: String },
    fax: { type: String },
    email: { type: String },

    shippingAddress: { type: String },
    invoiceAddress: { type: String },
    // 拆成送貨／發票地址之前的舊欄位，保留讓既有資料讀得到
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

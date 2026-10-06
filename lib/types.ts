export type EnquiryStatus = 'Pending' | 'Confirmed' | 'Cancelled';

/** Mode names come from `mode_master.mode_name` — they are data, not a fixed union. */
export type ShipmentMode = string;

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type DocType = 'IEC' | 'GST' | 'PAN' | 'KYC';

export interface ChargeRow {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  currency: Currency;
  /** Rate to INR that was applied to THIS charge row (1 for INR). */
  exchangeRate: number;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
  gbp: number;
}

export interface Enquiry {
  id: string;
  date: string;
  enquiryNo: string;
  customerId: string | null;
  customerName: string;
  customerAddress: string;
  customerGst: string;
  shipper: string;
  consignee: string;
  modeId: string | null;
  mode: ShipmentMode;
  polCountry: string;
  polPort: string;
  podCountry: string;
  podPort: string;
  commodity: string;
  packages: number;
  packageUnit: string;
  grossWeight: number;
  weightUnit: string;
  cbm: number;
  salesPersonId: string | null;
  salesPerson: string;
  status: EnquiryStatus;
  linkedJobNo: string | null;
  cancellationRemark?: string;
  charges: ChargeRow[];
  rates: ExchangeRates;
}

/** Values collected by the enquiry form (ids, not display names). */
export interface EnquiryInput {
  customerId: string;
  shipper: string;
  consignee: string;
  modeId: string;
  polCountry: string;
  polPort: string;
  podCountry: string;
  podPort: string;
  commodity: string;
  packages: number;
  packageUnit: string;
  grossWeight: number;
  weightUnit: string;
  cbm: number;
  salesPersonId: string;
  rates: ExchangeRates;
  charges: ChargeRow[];
}

export type Milestone = 'Booked' | 'Customs Cleared' | 'Handover' | 'Delivered';

export interface Shipment {
  id: string;
  jobNo: string;
  date: string;
  customerName: string;
  invoiceNo: string;
  shipper: string;
  consignee: string;
  mode: ShipmentMode;
  carrier: string;
  pol: string;
  pod: string;
  containerNos: string;
  hbl: string;
  mbl: string;
  sbillOrBoeNo: string;
  sbillOrBoeDate: string;
  leoDate: string | null;
  etd: string | null;
  eta: string | null;
  handoverDate: string | null;
  deliveryDate: string | null;
  blType: string;
  services: string;
  packages: number;
  grossWeight: number;
  weightUnit: string;
  remark: string;
  remarkDate: string | null;
  milestone: Milestone;
  status: 'Active' | 'Completed';
}

export interface KycDocument {
  id: string;
  customerId: string;
  customerName: string;
  docType: DocType;
  docNumber: string;
  /** Original file name for display (null when no file was uploaded). */
  fileName: string | null;
  /** Storage object path; null for legacy rows that only recorded a name. */
  filePath: string | null;
  uploadDate: string | null;
  expiryDate: string | null;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  gst: string;
  email: string;
}

export interface SalesPerson {
  id: string;
  name: string;
}

export interface Mode {
  id: string;
  name: string;
  code: string;
}

export interface Port {
  id: string;
  country: string;
  name: string;
  type: string;
  code: string;
}

export interface Company {
  name: string;
  address: string;
  gst: string;
  email: string;
  phone: string;
  terms: string;
}

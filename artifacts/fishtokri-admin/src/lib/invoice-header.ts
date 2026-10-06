export type InvoiceHeaderSettings = {
  companyName: string;
  address: string;
  phone: string;
  gstNumber: string;
  fssaiNumber: string;
};

export const DEFAULT_INVOICE_HEADER: InvoiceHeaderSettings = {
  companyName: "FISHTOKRI (ATHA FOODS Pvt Ltd)",
  address: "Thane",
  phone: "9220200100",
  gstNumber: "27AAOCA7628P1ZT",
  fssaiNumber: "21521066000481",
};

export const taxRates = {
  KE: {
    vat: 0.16,
    witholdingTax: 0.03,
    exciseDuty: {
      electronics: 0.10,
      luxuryGoods: 0.20,
      alcohol: 0.50,
      tobacco: 0.30,
      default: 0.00,
    },
  },
  US: {
    salesTax: {
      california: 0.0725,
      newYork: 0.08875,
      texas: 0.0625,
      florida: 0.06,
      default: 0.06,
    },
  },
  GB: {
    vat: 0.20,
  },
  DE: {
    vat: 0.19,
  },
  FR: {
    vat: 0.20,
  },
  CA: {
    gst: 0.05,
    pst: {
      britishColumbia: 0.07,
      ontario: 0.08,
      quebec: 0.09975,
      default: 0.00,
    },
  },
  AU: {
    gst: 0.10,
  },
  IN: {
    gst: 0.18,
  },
  JP: {
    consumptionTax: 0.10,
  },
  default: {
    vat: 0.00,
  },
} as const;

export type CountryCode = keyof typeof taxRates;

export function getTaxRate(
  country: CountryCode,
  region?: string,
  productType?: string
): number {
  const countryTax = taxRates[country] || taxRates.default;
  
  if (country === 'KE') {
    const vat = (countryTax as any).vat || 0;
    let exciseDuty = 0;
    
    if (productType && (countryTax as any).exciseDuty) {
      exciseDuty = (countryTax as any).exciseDuty[productType as keyof typeof (countryTax as any).exciseDuty] 
        || (countryTax as any).exciseDuty.default 
        || 0;
    }
    
    return vat + exciseDuty;
  }
  
  if (country === 'US') {
    const stateTax = region 
      ? (countryTax as any).salesTax[region as keyof typeof (countryTax as any).salesTax] 
      : (countryTax as any).salesTax.default;
    return stateTax || 0;
  }
  
  if (country === 'CA') {
    const gst = (countryTax as any).gst || 0;
    const pst = region 
      ? (countryTax as any).pst[region as keyof typeof (countryTax as any).pst] 
      : (countryTax as any).pst.default;
    return gst + (pst || 0);
  }
  
  return (countryTax as any).vat 
    || (countryTax as any).gst 
    || (countryTax as any).consumptionTax 
    || (countryTax as any).salesTax?.default 
    || 0;
}

export function calculateTax(
  amount: number,
  country: CountryCode,
  region?: string,
  productType?: string
): number {
  const taxRate = getTaxRate(country, region, productType);
  return Math.round(amount * taxRate * 100) / 100;
}

export function calculateTotalWithTax(
  amount: number,
  country: CountryCode,
  region?: string,
  productType?: string
): number {
  const tax = calculateTax(amount, country, region, productType);
  return amount + tax;
}

export const taxExemptCategories = [
  'books',
  'educational_materials',
  'medical_supplies',
  'baby_products',
  'agricultural_products',
  'export_goods',
] as const;

export function isTaxExempt(category: string, country: CountryCode): boolean {
  if (country === 'KE') {
    return taxExemptCategories.includes(category as any);
  }
  
  return false;
}

export const taxInvoices = {
  KE: {
    required: true,
    threshold: 24000,
    format: 'KE/XXXX/XXXX',
  },
  US: {
    required: false,
    threshold: 0,
    format: 'INV-XXXXXX',
  },
  GB: {
    required: true,
    threshold: 0,
    format: 'GB/XXXX/XXXX',
  },
  default: {
    required: false,
    threshold: 0,
    format: 'INV-XXXXXX',
  },
} as const;

export function requiresTaxInvoice(country: CountryCode, amount: number): boolean {
  const config = taxInvoices[country] || taxInvoices.default;
  return config.required && amount >= config.threshold;
}

export function generateTaxInvoiceNumber(country: CountryCode, sequence: number): string {
  const config = taxInvoices[country] || taxInvoices.default;
  const paddedSequence = sequence.toString().padStart(6, '0');
  
  return config.format.replace('XXXXXX', paddedSequence);
}

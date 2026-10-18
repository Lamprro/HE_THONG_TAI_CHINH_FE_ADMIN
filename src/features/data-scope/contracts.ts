export const aliasTypes = ['SHORT_NAME', 'FORMER_NAME', 'ENGLISH_NAME', 'NEWS_ALIAS', 'OTHER'] as const;
export const exchanges = ['HOSE', 'HNX', 'UPCOM', 'OTC', 'OTHER'] as const;
export const securityTypes = ['STOCK', 'ETF', 'FUND', 'BOND', 'WARRANT', 'OTHER'] as const;
export interface CompanyRequest {
  taxCode: string | null; companyCode: string; legalName: string; shortName: string | null;
  englishName: string | null; industryCode: string | null; industryName: string | null;
  sectorName: string | null; website: string | null; headquarters: string | null;
  foundedDate: string | null; listingStatus: string | null; description: string | null; active: boolean;
}
export interface Company extends CompanyRequest { id: string }
export interface CompanyAliasRequest { alias: string; aliasType: typeof aliasTypes[number] }
export interface CompanyAlias extends CompanyAliasRequest { id: number }
export interface SecurityRequest {
  companyId: string; symbol: string; exchange: typeof exchanges[number]; securityType: typeof securityTypes[number];
  isin: string | null; currency: string; listedDate: string | null; delistedDate: string | null;
  sharesOutstanding: number | null; parValue: number | null; primary: boolean; active: boolean;
}
export interface Security extends SecurityRequest { id: string }

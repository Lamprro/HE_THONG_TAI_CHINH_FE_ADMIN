import { useQuery } from '@tanstack/react-query';
import { API_BASE, getJson } from '../../shared/api/client';
import { write } from '../operations/api';
import type { Company, CompanyRequest, CompanyAlias, CompanyAliasRequest, Security, SecurityRequest } from './contracts';
const id = encodeURIComponent;
export const scopeApi = {
  createCompany: (body: CompanyRequest) => write<Company>('create-company', '/api/companies', 'POST', body),
  updateCompany: ({ companyId, body }: { companyId: string; body: CompanyRequest }) => write<Company>('update-company', `/api/companies/${id(companyId)}`, 'PUT', body),
  addAlias: ({ companyId, body }: { companyId: string; body: CompanyAliasRequest }) => write<CompanyAlias>('add-alias', `/api/companies/${id(companyId)}/aliases`, 'POST', body),
  createSecurity: (body: SecurityRequest) => write<Security>('create-security', '/api/securities', 'POST', body),
  updateSecurity: ({ securityId, body }: { securityId: string; body: SecurityRequest }) => write<Security>('update-security', `/api/securities/${id(securityId)}`, 'PUT', body),
  activation: ({ securityId, active }: { securityId: string; active: boolean }) => write<Security>('security-activation', `/api/securities/${id(securityId)}/activation`, 'PATCH', { active }),
};
export function useScopeQueries(enabled: boolean) {
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => getJson<Company[]>(API_BASE, '/api/companies'), enabled, staleTime: 60000 });
  const securities = useQuery({ queryKey: ['securities'], queryFn: () => getJson<Security[]>(API_BASE, '/api/securities?activeOnly=false'), enabled, staleTime: 60000 });
  return { companies, securities };
}
export function useAliases(companyId: string | null) {
  return useQuery({ queryKey: ['aliases', companyId], queryFn: () => getJson<CompanyAlias[]>(API_BASE, `/api/companies/${id(companyId!)}/aliases`), enabled: !!companyId });
}

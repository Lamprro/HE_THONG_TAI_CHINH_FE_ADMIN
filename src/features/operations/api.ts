import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE, requestJson } from '../../shared/api/client';
import { mutationBlock, type AdminAction } from '../../shared/api/access';
import type { DataSource, IngestionJob } from '../dashboard/types/dto';
import type { CreateIngestionJobRequest, DataSourceRequest, ManualIngestionRequest, IngestionExecutionResponse, ValidationExecutionResponse } from './contracts';

export async function write<T>(action: AdminAction, path: string, method: 'POST' | 'PATCH' | 'PUT', body?: unknown, deactivating = false): Promise<T> {
  const blocked = mutationBlock(action, deactivating);
  if (blocked) throw new Error(blocked);
  return requestJson<T>(API_BASE, path, method, body);
}
const id = encodeURIComponent;
export const adminApi = {
  updateJob: (jobId: string, body: CreateIngestionJobRequest) => write<IngestionJob>('edit-job', `/api/ingestion-jobs/${id(jobId)}`, 'PUT', body),
  createJob: (body: CreateIngestionJobRequest) => write<IngestionJob>('create-job', '/api/ingestion-jobs', 'POST', body),
  runJob: (jobId: string) => write<IngestionExecutionResponse>('run-job', `/api/ingestion-jobs/${id(jobId)}/run`, 'POST'),
  activation: ({ jobId, active }: { jobId: string; active: boolean }) => write<IngestionJob>('activation', `/api/ingestion-jobs/${id(jobId)}/activation`, 'PATCH', { active }, !active),
  manual: (body: ManualIngestionRequest) => write<IngestionExecutionResponse>('manual-ingestion', '/api/ingestions/manual', 'POST', body),
  upsertSource: (body: DataSourceRequest) => write<DataSource>('upsert-source', '/api/data-sources', 'POST', body),
  validateRaw: (rawId: string) => write<ValidationExecutionResponse>('validate-raw', `/api/admin/validation/raw-payloads/${id(rawId)}`, 'POST'),
  validatePending: (limit: number) => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Limit must be an integer from 1 to 100.');
    return write<ValidationExecutionResponse[]>('validate-pending', `/api/admin/validation/pending?limit=${limit}`, 'POST');
  },
};
export function useAdminMutation<T, R>(mutationFn: (input: T) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, retry: false, onSettled: async () => {
    // Even failed/timeout executions may have written a run or consumed the retry budget.
    await Promise.all(['jobs', 'sources', 'runs', 'run', 'payloads', 'payload', 'results', 'open-issues', 'versions', 'companies', 'securities', 'aliases'].map(key => client.invalidateQueries({ queryKey: [key] })));
  } });
}

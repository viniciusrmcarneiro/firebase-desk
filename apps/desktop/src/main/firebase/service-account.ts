import type {
  ServiceAccountSummary,
  ServiceAccountValidationResult,
} from '@firebase-desk/repo-contracts';

interface RawServiceAccount {
  readonly type?: unknown;
  readonly project_id?: unknown;
  readonly client_email?: unknown;
  readonly private_key?: unknown;
  readonly private_key_id?: unknown;
}

const REQUIRED_FIELDS = [
  'type',
  'project_id',
  'client_email',
  'private_key',
  'private_key_id',
] as const;

export function validateServiceAccountJson(json: string): ServiceAccountValidationResult {
  let parsed: RawServiceAccount;
  try {
    parsed = JSON.parse(json) as RawServiceAccount;
  } catch {
    return { ok: false, errors: ['Service account file is not valid JSON.'] };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, errors: ['Service account JSON must be an object.'] };
  }

  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (typeof parsed[field] !== 'string' || !parsed[field].trim()) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (parsed.type !== 'service_account') {
    errors.push('Field type must be service_account.');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    summary: toServiceAccountSummary(parsed),
  };
}

export function parseServiceAccountJson(json: string): ServiceAccountSummary {
  const result = validateServiceAccountJson(json);
  if (!result.ok || !result.summary) {
    throw new Error(result.errors?.join('\n') ?? 'Invalid service account JSON.');
  }
  return result.summary;
}

function toServiceAccountSummary(value: RawServiceAccount): ServiceAccountSummary {
  return {
    type: 'service_account',
    projectId: String(value.project_id),
    clientEmail: String(value.client_email),
  };
}

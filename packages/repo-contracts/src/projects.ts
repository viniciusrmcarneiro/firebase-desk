export type ProjectTarget = 'production' | 'emulator';

export interface EmulatorConnectionProfile {
  readonly firestoreHost: string;
  readonly authHost: string;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly target: ProjectTarget;
  readonly emulator?: EmulatorConnectionProfile | undefined;
  readonly hasCredential: boolean;
  readonly credentialEncrypted: boolean | null;
  readonly createdAt: string;
}

export interface ProjectUpdatePatch {
  readonly name?: string | undefined;
  readonly emulator?: EmulatorConnectionProfile | undefined;
}

export interface ProjectAddInput {
  readonly name: string;
  readonly projectId: string;
  readonly target: ProjectTarget;
  readonly emulator?: EmulatorConnectionProfile | undefined;
  readonly credentialJson?: string | undefined;
}

export interface ServiceAccountSummary {
  readonly type: 'service_account';
  readonly projectId: string;
  readonly clientEmail: string;
}

export interface ServiceAccountValidationResult {
  readonly ok: boolean;
  readonly summary?: ServiceAccountSummary | undefined;
  readonly errors?: string[] | undefined;
}

export interface PickServiceAccountFileResult {
  readonly canceled: boolean;
  readonly json?: string | undefined;
}

export interface ProjectsRepository {
  list(): Promise<ReadonlyArray<ProjectSummary>>;
  get(id: string): Promise<ProjectSummary | null>;
  add(input: ProjectAddInput): Promise<ProjectSummary>;
  update(id: string, patch: ProjectUpdatePatch): Promise<ProjectSummary>;
  remove(id: string): Promise<void>;
  validateServiceAccount?(json: string): Promise<ServiceAccountValidationResult>;
  pickServiceAccountFile?(): Promise<PickServiceAccountFileResult>;
}

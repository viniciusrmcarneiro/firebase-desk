import { z } from 'zod';
import {
  AuthUserSchema,
  AuthUsersPageSchema,
  ListUsersRequestSchema,
  SearchUsersRequestSchema,
  SetCustomClaimsRequestSchema,
} from './auth.ts';
import {
  CreateDocumentRequestSchema,
  DeleteDocumentRequestSchema,
  FirestoreCollectionNodeSchema,
  FirestoreDocumentResultSchema,
  FirestoreDocumentsPageSchema,
  FirestoreGeneratedDocumentIdSchema,
  FirestoreResultsPageSchema,
  FirestoreSaveDocumentResultSchema,
  GenerateDocumentIdRequestSchema,
  ListDocumentsRequestSchema,
  RunQueryRequestSchema,
  SaveDocumentRequestSchema,
} from './firestore.ts';
import { HealthCheckRequestSchema, HealthCheckResponseSchema } from './health.ts';
import {
  PickServiceAccountFileResultSchema,
  ProjectAddInputSchema,
  ProjectSummarySchema,
  ProjectUpdatePatchSchema,
  ServiceAccountValidationResultSchema,
} from './projects.ts';
import { ScriptRunRequestSchema, ScriptRunResultSchema } from './script-runner.ts';
import {
  DataModeSchema,
  HotkeyOverridesSchema,
  SettingsPatchSchema,
  SettingsSnapshotSchema,
} from './settings.ts';

/**
 * Central registry of every IPC channel. Keys are channel names; values are
 * the request/response schemas. Adding a method here is the single source of
 * truth for both the preload client and the main handler.
 */
export const IPC_CHANNELS = {
  'health.check': {
    request: HealthCheckRequestSchema,
    response: HealthCheckResponseSchema,
  },
  'app.config': {
    request: z.object({}),
    response: z.object({ dataDirectory: z.string(), dataMode: DataModeSchema }),
  },
  'app.openDataDirectory': {
    request: z.object({}),
    response: z.void(),
  },
  'projects.list': {
    request: z.object({}),
    response: z.array(ProjectSummarySchema),
  },
  'projects.get': {
    request: z.object({ id: z.string() }),
    response: ProjectSummarySchema.nullable(),
  },
  'projects.add': {
    request: ProjectAddInputSchema,
    response: ProjectSummarySchema,
  },
  'projects.update': {
    request: z.object({ id: z.string(), patch: ProjectUpdatePatchSchema }),
    response: ProjectSummarySchema,
  },
  'projects.remove': {
    request: z.object({ id: z.string() }),
    response: z.void(),
  },
  'projects.validateServiceAccount': {
    request: z.object({ json: z.string() }),
    response: ServiceAccountValidationResultSchema,
  },
  'projects.pickServiceAccountFile': {
    request: z.object({}),
    response: PickServiceAccountFileResultSchema,
  },
  'firestore.listRootCollections': {
    request: z.object({ connectionId: z.string() }),
    response: z.array(FirestoreCollectionNodeSchema),
  },
  'firestore.listDocuments': {
    request: ListDocumentsRequestSchema,
    response: FirestoreDocumentsPageSchema,
  },
  'firestore.listSubcollections': {
    request: z.object({ connectionId: z.string(), documentPath: z.string() }),
    response: z.array(FirestoreCollectionNodeSchema),
  },
  'firestore.runQuery': {
    request: RunQueryRequestSchema,
    response: FirestoreResultsPageSchema,
  },
  'firestore.getDocument': {
    request: z.object({ connectionId: z.string(), documentPath: z.string() }),
    response: FirestoreDocumentResultSchema.nullable(),
  },
  'firestore.generateDocumentId': {
    request: GenerateDocumentIdRequestSchema,
    response: FirestoreGeneratedDocumentIdSchema,
  },
  'firestore.createDocument': {
    request: CreateDocumentRequestSchema,
    response: FirestoreDocumentResultSchema,
  },
  'firestore.saveDocument': {
    request: SaveDocumentRequestSchema,
    response: FirestoreSaveDocumentResultSchema,
  },
  'firestore.deleteDocument': {
    request: DeleteDocumentRequestSchema,
    response: z.void(),
  },
  'scriptRunner.run': {
    request: ScriptRunRequestSchema,
    response: ScriptRunResultSchema,
  },
  'scriptRunner.cancel': {
    request: z.object({ runId: z.string() }),
    response: z.void(),
  },
  'auth.listUsers': {
    request: ListUsersRequestSchema,
    response: AuthUsersPageSchema,
  },
  'auth.getUser': {
    request: z.object({ projectId: z.string(), uid: z.string() }),
    response: AuthUserSchema.nullable(),
  },
  'auth.searchUsers': {
    request: SearchUsersRequestSchema,
    response: z.array(AuthUserSchema),
  },
  'auth.setCustomClaims': {
    request: SetCustomClaimsRequestSchema,
    response: AuthUserSchema,
  },
  'settings.load': {
    request: z.object({}),
    response: SettingsSnapshotSchema,
  },
  'settings.save': {
    request: SettingsPatchSchema,
    response: SettingsSnapshotSchema,
  },
  'settings.getHotkeyOverrides': {
    request: z.object({}),
    response: HotkeyOverridesSchema,
  },
  'settings.setHotkeyOverrides': {
    request: HotkeyOverridesSchema,
    response: z.void(),
  },
} as const;

export type IpcChannel = keyof typeof IPC_CHANNELS;

export type IpcRequest<C extends IpcChannel> = z.infer<(typeof IPC_CHANNELS)[C]['request']>;
export type IpcResponse<C extends IpcChannel> = z.infer<(typeof IPC_CHANNELS)[C]['response']>;

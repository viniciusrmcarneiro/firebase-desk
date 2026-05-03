import { type AppCoreStore, createAppCoreStore } from '../shared/store.ts';
import {
  createInitialJsQueryState,
  type CreateJsQueryStateInput,
  type JsQueryState,
} from './jsQueryState.ts';

export type JsQueryStore = AppCoreStore<JsQueryState>;

export function createJsQueryStore(input: CreateJsQueryStateInput = {}): JsQueryStore {
  return createAppCoreStore(createInitialJsQueryState(input));
}

import type { IpcChannel, IpcRequest, IpcResponse } from '@firebase-desk/ipc-schemas';

export type Handler<C extends IpcChannel> = (
  request: IpcRequest<C>,
) => Promise<IpcResponse<C>> | IpcResponse<C>;

export type IpcHandlerMap = { readonly [C in IpcChannel]: Handler<C>; };

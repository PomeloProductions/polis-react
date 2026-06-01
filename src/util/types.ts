export interface DispatchObject {
  [key: string]: unknown,
  type: string
}

type PromiseResolveValue<T> = T extends Promise<infer R> ? R : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EffectType<T extends (...args: any) => any> = ReturnType<ReturnType<T>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EffectReturnValue<T extends (...args: any) => any> = PromiseResolveValue<EffectType<T>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionType<T extends (...args: any) => any> = ReturnType<T> extends DispatchObject ? ReturnType<T> : EffectReturnValue<T>
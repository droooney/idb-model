import { MaybePromise } from '../types';

export function promiseTry<T>(func: () => MaybePromise<T>): Promise<T> {
  return new Promise<T>((resolve) => resolve(func()));
}

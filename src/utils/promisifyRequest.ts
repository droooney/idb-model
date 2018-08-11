export function promisifyRequest<T = undefined>(request: IDBRequest): Promise<T | undefined>;
export function promisifyRequest<T = undefined>(request: IDBRequest, defaultValue: T): Promise<T>;

export function promisifyRequest<T = undefined>(request: IDBRequest, defaultValue?: T): Promise<T | undefined> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result || defaultValue);
    });

    request.addEventListener('error', () => {
      reject(request.error);
    });
  });
}

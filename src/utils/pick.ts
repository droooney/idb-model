const { hasOwnProperty } = {};

export function pick<T extends object, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
  const newObject: Pick<T, K> = {} as any;

  for (const key in object) {
    if (hasOwnProperty.call(object, key) && keys.indexOf(key as any) !== -1) {
      (newObject as any)[key] = object[key];
    }
  }

  return newObject;
}

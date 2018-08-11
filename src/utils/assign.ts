const { hasOwnProperty } = {};

export function assign<T>(target: T, ...objects: (Partial<T> | undefined)[]): T {
  for (let i = 0, length = objects.length; i < length; i++) {
    const object = objects[i];

    if (object) {
      for (const key in object) {
        /* istanbul ignore else */
        if (hasOwnProperty.call(object, key)) {
          (target as any)[key] = object[key];
        }
      }
    }
  }

  return target;
}

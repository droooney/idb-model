export function getProto(object: any): any {
  return 'getPrototypeOf' in Object
    ? Object.getPrototypeOf(object)
    : object.__proto__; // eslint-disable-line no-proto
}

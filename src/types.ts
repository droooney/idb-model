/* eslint-disable space-infix-ops */
export type Diff<T extends string | number | symbol, U extends string | number | symbol> = ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T];

export type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>> & object;

export type Optional<T, K extends keyof T> = Omit<T, K> & { [U in K]?: T[K]; };

export type MaybePromise<T> = T | Promise<T>;
/* eslint-enable space-infix-ops */

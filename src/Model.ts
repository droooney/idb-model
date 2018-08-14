import {
  Database,
  IDBTransactionAllowedMode,
  IDBAnyTransaction,
  IDBWritableTransaction
} from './Database';
import { Optional, MaybePromise } from './types';

import { assign } from './utils/assign';
import { getProto } from './utils/getProto';
import { pick } from './utils/pick';
import { promiseTry } from './utils/promiseTry';
import { promisifyRequest } from './utils/promisifyRequest';

type AnyDatabase = Database<IDBTransactionAllowedMode>;

// eslint-disable-next-line space-infix-ops
export type Values<T, U extends keyof T = never> = Optional<T, U>;

export interface CommonOptions<T extends IDBAnyTransaction> {
  transaction?: T;
}

export interface CreateOptions extends CommonOptions<IDBWritableTransaction> {
  storeNames?: string[];
}

export interface FindOptions extends CommonOptions<IDBAnyTransaction> {}

interface CursorOptions extends CommonOptions<IDBAnyTransaction> {
  readOnly?: boolean;
  storeNames?: string[];
}

export interface ClearOptions extends CommonOptions<IDBWritableTransaction> {}

export interface CountOptions extends CommonOptions<IDBAnyTransaction> {}

export interface SaveOptions extends CommonOptions<IDBWritableTransaction> {
  storeNames?: string[];
}

export interface DeleteOptions extends CommonOptions<IDBWritableTransaction> {
  storeNames?: string[];
}

export interface UpdateOptions extends CommonOptions<IDBWritableTransaction> {
  storeNames?: string[];
}

// eslint-disable-next-line space-infix-ops
export type ModelClass<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never> = {
  new(values: Values<T, U>): M;
  modelName: string;
  primaryKey: P;
  db: AnyDatabase;
  defaultValues?: Partial<T> & (
    P extends U
      ? Optional<Pick<T, U>, P>
      : Pick<T, U>
  );
  fields?: string[];
};

export class Model<T, P extends keyof T, U extends keyof T = never> {
  public static modelName?: string;
  public static primaryKey?: string;
  public static db: AnyDatabase;
  public static defaultValues?: object;
  public static fields?: string[];

  // @ts-ignore
  private static _openCursor<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    callback: (cursor: IDBCursorWithValue, transaction: IDBAnyTransaction, stop: () => void) => void,
    options: CursorOptions
  ): Promise<void> {
    const {
      readOnly = true
    } = options;

    return this.db._useOrCreateTransaction(
      options.transaction,
      (options.storeNames || []).concat(this.modelName),
      readOnly ? 'readonly' : 'readwrite',
      (transaction) => (
        new Promise<void>((resolve, reject) => {
          const cursorRequest = transaction.objectStore(this.modelName).openCursor();
          let stopped = false;

          cursorRequest.onsuccess = () => {
            const cursor: IDBCursorWithValue | undefined = cursorRequest.result;

            if (cursor) {
              promiseTry(() => callback(cursor, transaction, () => {
                stopped = true;

                resolve();
              }))
                .then(() => {
                  if (!stopped) {
                    cursor.continue();
                  }
                })
                .catch(reject);
            } else {
              resolve();
            }
          };

          /* istanbul ignore next */
          cursorRequest.onerror = () => {
            reject(cursorRequest.error);
          };
        })
      )
    );
  }

  public static build<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>
  ): M {
    return new this(values);
  }

  public static bulkBuild<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>[]
  ): M[] {
    return values.map((values) => ((this as any).build as typeof Model['build'])(values));
  }

  public static bulkCreate<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>[],
    options: CreateOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(
      options.transaction,
      (options.storeNames || []).concat(this.modelName),
      'readwrite',
      (transaction) => (
        Promise.all(
          values.map((values) => (
            ((this as any).create as typeof Model['create'])(values, { transaction }) as Promise<M>
          ))
        )
      )
    );
  }

  public static bulkDelete<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    items: M[],
    options: DeleteOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(
      options.transaction,
      (options.storeNames || []).concat(this.modelName),
      'readwrite',
      (transaction) => (
        Promise.all(
          items.map((item) => (
            item.delete({ transaction })
          ))
        )
      )
    );
  }

  public static bulkSave<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    items: M[],
    options: SaveOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(
      options.transaction,
      (options.storeNames || []).concat(this.modelName),
      'readwrite',
      (transaction) => (
        Promise.all(
          items.map((item) => (
            item.save({ transaction })
          ))
        )
      )
    );
  }

  public static clear<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: ClearOptions = {}
  ): Promise<void> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', (transaction) => (
      promisifyRequest(transaction.objectStore(this.modelName).clear())
    ));
  }

  public static count<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: CountOptions = {}
  ): Promise<number> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readonly', (transaction) => (
      promisifyRequest<number>(transaction.objectStore(this.modelName).count(), 0)
    ));
  }

  public static create<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>,
    options: CreateOptions = {}
  ): Promise<M> {
    return ((this as any).build as typeof Model['build'])(values).save(options) as Promise<M>;
  }

  public static delete<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>
  ): Promise<M[]>;
  public static delete<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter: ((item: M) => boolean | any) | null | undefined,
  ): Promise<M[]>;
  public static delete<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: DeleteOptions
  ): Promise<M[]>;
  public static delete<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter: ((item: M) => boolean | any) | null | undefined,
    options: DeleteOptions
  ): Promise<M[]>;
  public static delete<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter?: ((item: M) => boolean | any) | null | undefined | DeleteOptions,
    options: DeleteOptions = {}
  ): Promise<M[]> {
    if (filter && typeof filter !== 'function') {
      options = filter;
      filter = undefined;
    }

    const instances: M[] = [];

    return ((this as any)._openCursor as typeof Model['_openCursor'])((cursor, transaction) => {
      const instance = ((this as any).build as typeof Model['build'])(cursor.value) as any as M;

      if (!filter || (filter as (item: M) => boolean | any)(instance)) {
        instances.push(instance);

        const onFulfilled = () => (
          promisifyRequest(cursor.delete())
        );

        if (instance.beforeDelete) {
          return promiseTry(() => instance.beforeDelete!(transaction as IDBWritableTransaction, options)).then(onFulfilled);
        }

        return onFulfilled();
      }
    }, assign({}, options, { readOnly: false })).then(() => instances);
  }

  public static findAll<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>
  ): Promise<M[]>;
  public static findAll<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter: ((item: M) => boolean | any) | null | undefined
  ): Promise<M[]>;
  public static findAll<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: FindOptions
  ): Promise<M[]>;
  public static findAll<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter: ((item: M) => boolean | any) | null | undefined,
    options: FindOptions
  ): Promise<M[]>;
  public static findAll<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter?: ((item: M) => boolean | any) | null | undefined | FindOptions,
    options: FindOptions = {}
  ): Promise<M[]> {
    if (filter && typeof filter !== 'function') {
      options = filter;
      filter = undefined;
    }

    const instances: M[] = [];

    return ((this as any)._openCursor as typeof Model['_openCursor'])((cursor) => {
      const instance = ((this as any).build as typeof Model['build'])(cursor.value) as any as M;

      if (!filter || (filter as (item: M) => boolean | any)(instance)) {
        instances.push(instance);
      }
    }, options).then(() => instances);
  }

  public static findOne<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>
  ): Promise<M | null>;
  public static findOne<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter: ((item: M) => boolean | any) | null | undefined
  ): Promise<M | null>;
  public static findOne<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: FindOptions
  ): Promise<M | null>;
  public static findOne<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter: ((item: M) => boolean | any) | null | undefined,
    options: FindOptions
  ): Promise<M | null>;
  public static findOne<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter?: ((item: M) => boolean | any) | null | undefined | FindOptions,
    options: FindOptions = {}
  ): Promise<M | null> {
    if (filter && typeof filter !== 'function') {
      options = filter;
      filter = undefined;
    }

    let instance: M | null = null;

    return ((this as any)._openCursor as typeof Model['_openCursor'])((cursor, _transaction, stop) => {
      const item = ((this as any).build as typeof Model['build'])(cursor.value) as any as M;

      if (!filter || (filter as (item: M) => boolean | any)(item)) {
        instance = item;

        stop();
      }
    }, options).then(() => instance);
  }

  public static findByPrimary<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    primary: T[P],
    options: FindOptions = {}
  ): Promise<M | null> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readonly', (transaction) => (
      promisifyRequest<M | null>(transaction.objectStore(this.modelName).get(primary), null)
    )).then((instance) => (
      instance && (((this as any).build as typeof Model['build'])(instance as any) as any as M)
    ));
  }

  public static update<T, K extends keyof T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Pick<T, K> | ((item: M) => void)
  ): Promise<M[]>;
  public static update<T, K extends keyof T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Pick<T, K> | ((item: M) => void),
    filter: ((item: M) => boolean | any) | null | undefined,
  ): Promise<M[]>;
  public static update<T, K extends keyof T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Pick<T, K> | ((item: M) => void),
    options: DeleteOptions
  ): Promise<M[]>;
  public static update<T, K extends keyof T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Pick<T, K> | ((item: M) => void),
    filter: ((item: M) => boolean | any) | null | undefined,
    options: DeleteOptions
  ): Promise<M[]>;
  public static update<T, K extends keyof T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Pick<T, K> | ((item: M) => void),
    filter?: ((item: M) => boolean | any) | null | undefined | UpdateOptions,
    options: UpdateOptions = {}
  ): Promise<M[]> {
    if (filter && typeof filter !== 'function') {
      options = filter;
      filter = undefined;
    }

    const instances: M[] = [];

    return ((this as any)._openCursor as typeof Model['_openCursor'])((cursor, transaction) => {
      const instance = ((this as any).build as typeof Model['build'])(cursor.value) as any as M;

      if (!filter || (filter as (item: M) => boolean | any)(instance)) {
        instances.push(instance);

        if (typeof values === 'function') {
          values(instance);
        } else {
          assign(instance, values as any);
        }

        const onFulfilled = () => (
          promisifyRequest(cursor.update(instance.toJSON()))
        );

        if (instance.beforeSave) {
          return promiseTry(() => instance.beforeSave!(transaction as IDBWritableTransaction, options)).then(onFulfilled);
        }

        return onFulfilled();
      }
    }, assign({}, options, { readOnly: false })).then(() => instances);
  }

  public constructor(values: Values<T, U>) {
    const defaultValues = this._getModel().defaultValues as Partial<this> | undefined;

    assign(this, defaultValues, values);
  }

  private _getDatabase(): AnyDatabase {
    return this._getModel().db;
  }

  private _getModel(): ModelClass<T, Model<T, P, U> & T, P, U> {
    return getProto(this).constructor;
  }

  private _getModelName(): string {
    return this._getModel().modelName;
  }

  private _getPrimaryKey(): P {
    return this._getModel().primaryKey;
  }

  public beforeDelete?(transaction: IDBWritableTransaction, options: DeleteOptions): MaybePromise<void>;

  public beforeSave?(transaction: IDBWritableTransaction, options: SaveOptions): MaybePromise<void>;

  public delete(options: DeleteOptions = {}): Promise<this> {
    if (!(this._getPrimaryKey() in this)) {
      return Promise.resolve(this);
    }

    return promiseTry(() => {
      const primaryKey = this._getPrimaryKey();

      const db = this._getDatabase();
      const modelName = this._getModelName();

      return db._useOrCreateTransaction(
        options.transaction,
        (options.storeNames || []).concat(modelName),
        'readwrite',
        (transaction) => {
          const onFulfilled = () => promisifyRequest(transaction.objectStore(modelName).delete((this as any)[primaryKey]));

          if (this.beforeDelete) {
            return promiseTry(() => this.beforeDelete!(transaction, options)).then(onFulfilled);
          }

          return onFulfilled();
        }
      ).then(() => this);
    });
  }

  public save(options: SaveOptions = {}): Promise<this> {
    return promiseTry(() => {
      const db = this._getDatabase();
      const modelName = this._getModelName();

      return db._useOrCreateTransaction(
        options.transaction,
        (options.storeNames || []).concat(modelName),
        'readwrite',
        (transaction) => {
          const onFulfilled = () => {
            const primaryKey = this._getPrimaryKey();
            const item = this.toJSON();

            return promisifyRequest<T[P]>(
              transaction.objectStore(modelName)[primaryKey in this ? 'put' : 'add'](item)
            ).then((primary) => {
              (this as any as T)[primaryKey] = primary!;
            });
          };

          if (this.beforeSave) {
            return promiseTry(() => this.beforeSave!(transaction, options)).then(onFulfilled);
          }

          return onFulfilled();
        }
      );
    }).then(() => this);
  }

  public toJSON<K extends keyof T>(): Pick<T, K> {
    const fields = this._getModel().fields;

    return fields
      ? pick(this, fields as (keyof this)[])
      : assign({}, this) as any;
  }
}

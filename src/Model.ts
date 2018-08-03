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

declare global {
  interface IDBObjectStore {
    getAll(): IDBRequest;
  }
}

type AnyDatabase = Database<IDBTransactionAllowedMode>;

// eslint-disable-next-line space-infix-ops
export type Values<T, U extends keyof T = never> = Optional<T, U>;

export interface CommonOptions<T extends IDBAnyTransaction> {
  transaction?: T;
}

export interface CreateOptions extends CommonOptions<IDBWritableTransaction> {}

export interface FindOptions extends CommonOptions<IDBAnyTransaction> {}

export interface RecordsOptions extends CommonOptions<IDBAnyTransaction> {
  readOnly?: boolean;
}

export interface ClearOptions extends CommonOptions<IDBWritableTransaction> {}

export interface CountOptions extends CommonOptions<IDBAnyTransaction> {}

export interface SaveOptions extends CommonOptions<IDBWritableTransaction> {}

export interface DeleteOptions extends CommonOptions<IDBWritableTransaction> {
  deletePrimary?: boolean;
}

export interface UpdateOptions extends CommonOptions<IDBWritableTransaction> {}

// eslint-disable-next-line space-infix-ops
export type ModelClass<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never> = {
  new(values: Values<T, U>): M;
  modelName: string;
  primaryKey: P;
  db: AnyDatabase;
  defaultValues?: P extends U
    ? Optional<Pick<T, U>, P>
    : Pick<T, U>;
  fields: string[];
};

type ModelPrivateFields = (
  '_transaction'
  | '_delete'
  | '_update'
);

export class Model<T extends { [key in P]: number | string }, P extends keyof T, U extends keyof T = never> {
  public static modelName?: string;
  public static primaryKey?: string;
  public static db: AnyDatabase;
  public static defaultValues?: object;
  public static fields?: string[];

  public static build<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>
  ): M {
    return new this(values);
  }

  public static bulkBuild<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>[]
  ): M[] {
    return values.map((values) => new this(values));
  }

  public static bulkCreate<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>[],
    options: CreateOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', (transaction) => (
      Promise.all(
        values.map((values) => (
          new this(values).save({ transaction })
        ))
      )
    ));
  }

  public static bulkDelete<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    items: M[],
    options: DeleteOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', (transaction) => (
      Promise.all(
        items.map((item) => (
          item.delete({ transaction })
        ))
      )
    ));
  }

  public static bulkSave<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    items: M[],
    options: SaveOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', (transaction) => (
      Promise.all(
        items.map((item) => (
          item.save({ transaction })
        ))
      )
    ));
  }

  public static async clear<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: ClearOptions = {}
  ): Promise<void> {
    await this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', (transaction) => (
      this.db.request(transaction.objectStore(this.modelName).clear())
    ));
  }

  public static count<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: CountOptions = {}
  ): Promise<number> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readonly', (transaction) => (
      this.db.request<number>(transaction.objectStore(this.modelName).count(), 0)
    ));
  }

  public static create<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Values<T, U>,
    options: CreateOptions = {}
  ): Promise<M> {
    return new this(values).save({
      transaction: options.transaction
    });
  }

  public static async delete<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter?: ((item: M) => boolean | any) | null | undefined,
    options: DeleteOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', async (transaction) => {
      return (this as any).bulkDelete(await (this as any).findAll(filter, { transaction }), { transaction });
    });
  }

  public static async findAll<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter?: ((item: M) => boolean | any) | null | undefined,
    options: FindOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readonly', async (transaction) => {
      const instances: M[] = [];
      const objectStore = transaction.objectStore(this.modelName);

      if (filter) {
        await new Promise<void>((resolve, reject) => {
          const cursorRequest = objectStore.openCursor();

          cursorRequest.onsuccess = () => {
            const cursor: IDBCursorWithValue | undefined = cursorRequest.result;

            if (cursor) {
              const instance = (this as any).build(cursor.value) as M;

              if (filter(instance)) {
                instances.push(instance);
              }

              cursor.continue();
            } else {
              resolve();
            }
          };

          cursorRequest.onerror = () => {
            reject(cursorRequest.error);
          };
        });
      } else {
        (await this.db.request<M[]>(objectStore.getAll(), [])).forEach((item) => {
          instances.push((this as any).build(item) as M);
        });
      }

      return instances;
    });
  }

  public static async findOne<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    filter?: ((item: M) => boolean | any) | null | undefined,
    options: FindOptions = {}
  ): Promise<M | null> {
    const eventualFilter = filter || (() => true);

    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readonly', async (transaction) => {
      let instance: M | null = null;

      await new Promise<void>((resolve, reject) => {
        const cursorRequest = transaction.objectStore(this.modelName).openCursor();

        cursorRequest.onsuccess = () => {
          const cursor: IDBCursorWithValue | undefined = cursorRequest.result;

          if (cursor) {
            const item = (this as any).build(cursor.value) as M;

            if (eventualFilter(item)) {
              instance = item;

              resolve();
            } else {
              cursor.continue();
            }
          } else {
            resolve();
          }
        };

        cursorRequest.onerror = () => {
          reject(cursorRequest.error);
        };
      });

      return instance;
    });
  }

  public static async findByPrimary<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    primary: T[P],
    options: FindOptions = {}
  ): Promise<M | null> {
    const instance = await this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readonly', (transaction) => (
      this.db.request<M | null>(transaction.objectStore(this.modelName).get(primary), null)
    ));

    return instance && ((this as any).build(instance as M) as M);
  }

  public static async *records<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    options: RecordsOptions = {}
  ): AsyncIterable<M> {
    const {
      readOnly = true
    } = options;
    let transaction: IDBAnyTransaction;
    let prevItem: M | undefined;
    let cursor: IDBCursorWithValue | undefined;
    let gotNextItem: () => void;
    let throwError: (err: any) => void;
    const openCursor = () => {
      const cursorRequest = transaction.objectStore(this.modelName).openCursor();

      cursorRequest.onsuccess = () => {
        cursor = cursorRequest.result as IDBCursorWithValue | undefined;

        gotNextItem();
      };

      cursorRequest.onerror = () => {
        throwError(cursorRequest.error);
      };
    };

    if (options.transaction) {
      transaction = options.transaction;
    } else {
      const connection = await this.db.getConnection();

      transaction = connection.transaction(this.modelName, readOnly ? 'readonly' : 'readwrite') as IDBAnyTransaction;
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve, reject) => {
        gotNextItem = resolve;
        throwError = reject;

        if (cursor) {
          delete prevItem!._delete;
          delete prevItem!._update;
          delete prevItem!._transaction;

          cursor.continue();
        } else {
          openCursor();
        }
      });

      if (cursor && cursor.value) {
        prevItem = (this as any).build(cursor.value) as M;
        prevItem._setPrivateField('_transaction', transaction as IDBWritableTransaction);
        prevItem._setPrivateField('_update', async (item) => {
          await this.db.request(cursor!.update(item));
        });
        prevItem._setPrivateField('_delete', async () => {
          await this.db.request(cursor!.delete());
        });

        yield prevItem;
      } else {
        return;
      }
    }
  }

  public static async update<T extends { [key in P]: number | string }, K extends keyof T, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    this: ModelClass<T, M, P, U>,
    values: Pick<T, K> | ((item: M) => void),
    filter?: ((item: M) => boolean | any) | null | undefined,
    options: UpdateOptions = {}
  ): Promise<M[]> {
    return this.db._useOrCreateTransaction(options.transaction, this.modelName, 'readwrite', async (transaction) => {
      const instances = (await (this as any).findAll(filter, { transaction })) as M[];

      instances.forEach((instance) => {
        if (typeof values === 'function') {
          values(instance);
        } else {
          assign(instance, values as any);
        }
      });

      return (this as any).bulkSave(instances, { transaction });
    });
  }

  private _transaction?: IDBWritableTransaction;
  private _delete?(): Promise<void>;
  private _update?(item: Pick<this, keyof this>): Promise<void>;

  public constructor(values: Values<T, U>) {
    const defaultValues = this._getModel().defaultValues as Partial<this> | undefined;

    assign(this, defaultValues, values);
  }

  private _getDatabase(): AnyDatabase {
    return this._getModel().db;
  }

  private _getDatabaseFields(): Pick<this, keyof this> {
    return pick(this, this._getModel().fields as (keyof this)[]);
  }

  private _getModel(): ModelClass<T, Model<T, P, U>, P, U> {
    return getProto(this).constructor;
  }

  private _getModelName(): string {
    return this._getModel().modelName;
  }

  private _getPrimaryKey(): P {
    return this._getModel().primaryKey;
  }

  // @ts-ignore
  private _setPrivateField<T extends ModelPrivateFields>(field: T, value: this[T]): void {
    Object.defineProperty(this, field, {
      configurable: true,
      enumerable: false,
      writable: true,
      value
    });
  }

  // @ts-ignore
  public async beforeDelete(transaction: IDBWritableTransaction): MaybePromise<void> {}

  // @ts-ignore
  public async beforeSave(transaction: IDBWritableTransaction): MaybePromise<void> {}

  public async delete(options: DeleteOptions = {}): Promise<this> {
    if ((!this._delete || !this._transaction) && !(this._getPrimaryKey() in this)) {
      return this;
    }

    const {
      deletePrimary = true
    } = options;
    const primaryKey = this._getPrimaryKey();

    if (this._delete && this._transaction) {
      if (this.beforeDelete !== Model.prototype.beforeDelete) {
        await this.beforeDelete(this._transaction);
      }

      await this._delete();
    } else {
      const db = this._getDatabase();
      const modelName = this._getModelName();

      await db._useOrCreateTransaction(options.transaction, modelName, 'readwrite', async (transaction) => {
        if (this.beforeDelete !== Model.prototype.beforeDelete) {
          await this.beforeDelete(transaction);
        }

        await db.request(transaction.objectStore(modelName).delete((this as any as T)[primaryKey]));
      });
    }

    if (deletePrimary) {
      delete (this as any as T)[primaryKey];
    }

    return this;
  }

  public async save(options: SaveOptions = {}): Promise<this> {
    if (this._update && this._transaction) {
      if (this.beforeSave !== Model.prototype.beforeSave) {
        await this.beforeSave(this._transaction);
      }

      await this._update(this._getDatabaseFields());
    } else {
      const db = this._getDatabase();
      const modelName = this._getModelName();

      await db._useOrCreateTransaction(options.transaction, modelName, 'readwrite', async (transaction) => {
        if (this.beforeSave !== Model.prototype.beforeSave) {
          await this.beforeSave(transaction);
        }

        const primaryKey = this._getPrimaryKey();
        const item = this._getDatabaseFields();

        (this as any as T)[primaryKey] = (await db.request<T[P]>(
          transaction.objectStore(modelName)[primaryKey in this ? 'put' : 'add'](item)
        ))!;
      });
    }

    return this;
  }
}

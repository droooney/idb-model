import { Model, ModelClass } from './Model';
import { Version, VERSION_OBJECT_STORE_NAME, versionMigration } from './Version';
import { MaybePromise } from './types';

export type IDBTransactionAllowedMode = 'readonly' | 'readwrite';

export interface DatabaseOptions<M> {
  transactionMode?: M;
  onBlocked?(this: IDBOpenDBRequest, ev: Event): any;
  onVersionChange?(this: IDBDatabase, ev: Event): any;
}

export type Migration = (db: IDBDatabase, transaction: IDBVersionChangeTransaction) => MaybePromise<void>;

export interface IDBReadOnlyTransaction extends IDBTransaction {
  mode: 'readonly';
}

export interface IDBReadWriteTransaction extends IDBTransaction {
  mode: 'readwrite';
}

export interface IDBVersionChangeTransaction extends IDBTransaction {
  mode: 'versionchange';
}

export type IDBAnyTransaction = IDBReadOnlyTransaction | IDBReadWriteTransaction | IDBVersionChangeTransaction;

export type IDBWritableTransaction = IDBReadWriteTransaction | IDBVersionChangeTransaction;

export interface IDBTransactionMap {
  readonly: IDBReadOnlyTransaction;
  readwrite: IDBReadWriteTransaction;
  versionchange: IDBVersionChangeTransaction;
}

export class Database<M extends IDBTransactionAllowedMode = 'readonly'> {
  public name: string;
  public transactionMode: M;
  public onBlocked: ((this: IDBOpenDBRequest, ev: Event) => any) | null;
  public onVersionChange: ((this: IDBDatabase, ev: Event) => any) | null;
  public connection?: IDBDatabase;

  public constructor(name: string, options: DatabaseOptions<M> = {}) {
    this.name = name;
    this.transactionMode = options.transactionMode || ('readonly' as M);
    this.onBlocked = options.onBlocked || null;
    this.onVersionChange = options.onVersionChange || null;
  }

  private async _applyMigrations(
    oldDBVersion: number,
    currentVersionEntry: Version | null,
    migrations: Migration[]
  ): Promise<void> {
    this.close();

    const request = indexedDB.open(this.name, oldDBVersion + 1);

    await new Promise<void>((resolve, reject) => {
      let upgrading: boolean = false;

      request.onupgradeneeded = () => {
        upgrading = true;

        const connection = this.connection = request.result;

        if (!connection) {
          return reject(new Error('Unable to open database'));
        }

        const transaction = request.transaction as IDBVersionChangeTransaction;

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        (async () => {
          const transaction = request.transaction as IDBVersionChangeTransaction;
          const oldVersion = currentVersionEntry
            ? currentVersionEntry.version
            : -1;

          for (let i = oldVersion + 1, length = migrations.length; i < length; i++) {
            await migrations[i](connection, transaction);

            if (!currentVersionEntry) {
              currentVersionEntry = new Version({ id: 1, version: 0 });
            }

            currentVersionEntry.version = i;

            await currentVersionEntry.save({ transaction });
          }
        })();
      };

      request.addEventListener('success', () => {
        if (!upgrading) {
          this.connection = request.result;

          if (!this.connection) {
            return reject(new Error('Unable to open database'));
          }

          resolve();
        }
      });
    });
  }

  private async _openDatabase(version?: number): Promise<IDBDatabase> {
    if (this.connection) {
      this.connection.close();
    }

    const request = indexedDB.open(this.name, version);

    request.onblocked = this.onBlocked;

    const connection = await this.request<IDBDatabase>(request);

    if (!connection) {
      throw new Error('Unable to open database');
    }

    connection.onversionchange = this.onVersionChange;

    return connection;
  }

  public async _useOrCreateTransaction<K extends IDBTransactionAllowedMode | null | undefined, T extends IDBAnyTransaction | undefined, ReturnValue = void>(
    transaction: T,
    store: string | string[],
    mode: K,
    callback: (transaction: T extends IDBAnyTransaction ? T : K extends IDBTransactionAllowedMode ? IDBTransactionMap[K] : IDBTransactionMap[M]) => ReturnValue | Promise<ReturnValue>
  ): Promise<ReturnValue> {
    if (transaction) {
      return callback(transaction as any);
    }

    return this.transaction(store, mode, callback as any) as any;
  }

  public close(): void {
    if (this.connection) {
      this.connection.close();
    }

    this.connection = undefined;
  }

  public async delete(): Promise<void> {
    if (this.connection) {
      this.connection = undefined;
    }

    await this.request(indexedDB.deleteDatabase(this.name));
  }

  public async getConnection(): Promise<IDBDatabase> {
    if (!this.connection) {
      this.connection = await this._openDatabase();
    }

    return this.connection;
  }

  public async migrate(migrations: Migration[]): Promise<void> {
    this.model(Version);

    this.connection = await this._openDatabase();

    const hasVersionObjectStore = this.connection.objectStoreNames.contains(VERSION_OBJECT_STORE_NAME);
    let currentVersionEntry: Version | null = null;

    if (hasVersionObjectStore) {
      currentVersionEntry = await Version.findByPrimary(1);
    }

    if (!currentVersionEntry || currentVersionEntry.version !== migrations.length) {
      await this._applyMigrations(this.connection.version, currentVersionEntry, [
        versionMigration,
        ...migrations
      ]);
    }
  }

  public model<T extends { [key in P]: number | string }, M extends Model<T, P, U>, P extends keyof T, U extends keyof T = never>(
    model: ModelClass<T, M, P, U>
  ): void {
    model.db = this;
  }

  public async transaction<K extends IDBTransactionAllowedMode | null | undefined, ReturnValue = void>(
    store: string | string[],
    callback: (transaction: IDBTransactionMap[M]) => MaybePromise<ReturnValue>
  ): Promise<ReturnValue>;
  public async transaction<K extends IDBTransactionAllowedMode | null | undefined, ReturnValue = void>(
    store: string | string[],
    mode: K | null | undefined,
    callback: (transaction: IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]) => MaybePromise<ReturnValue>
  ): Promise<ReturnValue>;
  public async transaction<K extends IDBTransactionAllowedMode | null | undefined, ReturnValue = void>(
    store: string | string[],
    mode: K | null | undefined | ((transaction: IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]) => MaybePromise<ReturnValue>),
    callback?: ((transaction: IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]) => MaybePromise<ReturnValue>)
  ): Promise<ReturnValue> {
    if (typeof mode === 'function') {
      callback = mode;
      mode = null;
    }

    const db = await this.getConnection();

    return await callback!(
      db.transaction(
        store,
        (mode || this.transactionMode) as IDBTransactionAllowedMode
      ) as IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]
    );
  }

  public async request<T = undefined>(request: IDBRequest): Promise<T | undefined>;
  public async request<T = undefined>(request: IDBRequest, defaultValue: T): Promise<T>;
  public async request<T = undefined>(request: IDBRequest, defaultValue?: T): Promise<T | undefined> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || defaultValue);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

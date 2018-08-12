import { Model, ModelClass } from './Model';
import { Version, VERSION_OBJECT_STORE_NAME, versionMigration } from './Version';

import { promiseTry } from './utils/promiseTry';
import { promisifyRequest } from './utils/promisifyRequest';

import { MaybePromise } from './types';

export type IDBTransactionAllowedMode = 'readonly' | 'readwrite';

export interface DatabaseOptions<M> {
  transactionMode?: M;
  onBlocked?(this: IDBOpenDBRequest, ev: Event): any;
  onVersionChange?(this: IDBDatabase, ev: Event): any;
}

export type Migration = (db: IDBDatabase, transaction: IDBVersionChangeTransaction) => any;

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

  private _applyMigrations(
    oldDBVersion: number,
    currentVersionEntry: Version | null,
    migrations: Migration[]
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.close();

      const request = indexedDB.open(this.name, oldDBVersion + 1);

      request.onblocked = this.onBlocked;

      request.onupgradeneeded = () => {
        const connection = this.connection = request.result;

        /* istanbul ignore if */
        if (!connection) {
          return reject(new Error('Unable to open database'));
        }

        connection.onversionchange = this.onVersionChange;

        const transaction = request.transaction as IDBVersionChangeTransaction;

        transaction.addEventListener('complete', () => resolve());
        transaction.addEventListener('abort', () => reject(transaction.error));

        const oldVersion = currentVersionEntry
          ? currentVersionEntry.version
          : -1;
        let migrationsPromise: Promise<any> = Promise.resolve();

        migrations.slice(oldVersion + 1).forEach((migration, i) => {
          i = oldVersion + 1 + i;

          migrationsPromise = migrationsPromise
            .then(() => migration(connection, transaction))
            .then(() => {
              if (!currentVersionEntry) {
                currentVersionEntry = new Version({ id: 1, version: 0 });
              }

              currentVersionEntry.version = i;

              return currentVersionEntry.save({ transaction });
            });
        });

        migrationsPromise.catch(reject);
      };
    });
  }

  private _executeWithConnection<R>(callback: (connection: IDBDatabase) => Promise<R>): Promise<R> {
    if (this.connection) {
      return callback(this.connection);
    }

    return this.getConnection().then((connection) => callback(connection));
  }

  public _useOrCreateTransaction<K extends IDBTransactionAllowedMode, T extends IDBAnyTransaction | undefined, R = void>(
    transaction: T,
    store: string | string[],
    mode: K,
    callback: (transaction: T extends IDBAnyTransaction ? T : IDBTransactionMap[K]) => MaybePromise<R>
  ): Promise<R> {
    if (transaction) {
      return promiseTry(() => callback(transaction as any));
    }

    return this.transaction(store, mode, callback as any) as any;
  }

  public close(): void {
    if (this.connection) {
      this.connection.close();
    }

    this.connection = undefined;
  }

  public delete(): Promise<void> {
    return promiseTry(() => {
      this.close();

      return promisifyRequest(indexedDB.deleteDatabase(this.name));
    });
  }

  public getConnection(): Promise<IDBDatabase> {
    if (this.connection) {
      return Promise.resolve(this.connection);
    }

    return new Promise<IDBDatabase | undefined>((resolve) => {
      const request = indexedDB.open(this.name);

      request.onblocked = this.onBlocked;

      resolve(promisifyRequest<IDBDatabase>(request));
    }).then((connection) => {
      /* istanbul ignore if */
      if (!connection) {
        throw new Error('Unable to open database');
      }

      connection.onversionchange = this.onVersionChange;

      this.connection = connection;

      return connection;
    });
  }

  public migrate(migrations: Migration[]): Promise<void> {
    return this._executeWithConnection((connection) => (
      promiseTry(() => {
        this.model(Version);

        const hasVersionObjectStore = connection.objectStoreNames.contains(VERSION_OBJECT_STORE_NAME);

        return hasVersionObjectStore
          ? Version.findByPrimary(1)
          : null;
      }).then((currentVersionEntry) => {
        if (!currentVersionEntry || currentVersionEntry.version !== migrations.length) {
          return this._applyMigrations(
            connection.version,
            currentVersionEntry,
            [versionMigration].concat(migrations)
          );
        }
      })
    ));
  }

  public model<T, M extends Model<T, P, U> & T, P extends keyof T, U extends keyof T = never>(
    model: ModelClass<T, M, P, U>
  ): void {
    model.db = this;
  }

  public transaction<K extends IDBTransactionAllowedMode | null | undefined, R = void>(
    store: string | string[],
    callback: (transaction: IDBTransactionMap[M]) => MaybePromise<R>
  ): Promise<R>;
  public transaction<K extends IDBTransactionAllowedMode | null | undefined, R = void>(
    store: string | string[],
    mode: K | null | undefined,
    callback: (transaction: IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]) => MaybePromise<R>
  ): Promise<R>;
  public transaction<K extends IDBTransactionAllowedMode | null | undefined, R = void>(
    store: string | string[],
    mode: K | null | undefined | ((transaction: IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]) => MaybePromise<R>),
    callback?: ((transaction: IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M]) => MaybePromise<R>)
  ): Promise<R> {
    return this._executeWithConnection((connection) => promiseTry(() => {
      if (typeof mode === 'function') {
        callback = mode;
        mode = null;
      }

      const transaction = connection.transaction(
        store,
        (mode || this.transactionMode) as IDBTransactionAllowedMode
      ) as IDBTransactionMap[K extends IDBTransactionAllowedMode ? K : M];

      return Promise.all([
        callback!(transaction),
        new Promise<void>((resolve) => {
          transaction.addEventListener('complete', () => {
            resolve();
          });
        })
      ]).then((result) => result[0]);
    }));
  }
}

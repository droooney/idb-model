/* eslint-disable spaced-comment */
///<reference types="mocha" />
/* eslint-enable spaced-comment */

import {
  Database,
  IDBAnyTransaction,
  IDBWritableTransaction,
  promisifyRequest
} from '../src';

declare module 'mocha' {
  interface Context {
    db: Database;
    dbName: string;
    getAllRecords(store: string, transaction?: IDBAnyTransaction): Promise<any[]>;
    addRecords(store: string, records: any[], transaction?: IDBWritableTransaction): Promise<void>;
  }
}

let testCounter = 0;

beforeEach(async function () {
  this.dbName = `test-db-${testCounter++}`;

  const db = this.db = new Database(this.dbName);

  this.getAllRecords = async (store, transaction) => {
    return db._useOrCreateTransaction(transaction, store, 'readonly', (transaction) => {
      return new Promise<any[]>((resolve, reject) => {
        const cursorRequest = transaction.objectStore(store).openCursor();
        const items: any[] = [];

        cursorRequest.onsuccess = () => {
          const cursor: IDBCursorWithValue | undefined = cursorRequest.result;

          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            resolve(items);
          }
        };

        cursorRequest.onerror = () => {
          reject(cursorRequest.error);
        };
      });
    });
  };

  this.addRecords = async (store, records, transaction) => {
    const connection = await db.getConnection();
    const objectStore = (transaction || connection.transaction(store, 'readwrite')).objectStore(store);

    await Promise.all(records.map((record) => promisifyRequest(objectStore.add(record))));
  };
});

afterEach(async function () {
  await this.db.delete();
});

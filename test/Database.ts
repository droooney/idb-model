/* eslint-disable spaced-comment */
///<reference types="mocha" />
/* eslint-enable spaced-comment */
import assert from 'assert';

import { getRandomString } from './random';
import { Database, Migration } from '../src';

declare global {
  interface DOMStringList {
    [Symbol.iterator](): Iterator<string>;
  }
}

describe('Database', () => {
  it('should connect to database', async function () {
    const connection = await this.db.getConnection();

    assert(connection instanceof IDBDatabase);
  });

  describe('#migrate', () => {
    it('should execute simple migration', async function () {
      const name = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore(name)
      ]);

      const storeNames = [...(await this.db.getConnection()).objectStoreNames].filter((name) => name !== '__version__');

      assert.deepStrictEqual(storeNames, [name]);
    });

    it('should reject migration transaction errors', async function () {
      let notThrown = true;

      try {
        await this.db.migrate([
          async (db, transaction) => {
            db.createObjectStore('store', { keyPath: 'id' });

            await this.addRecords('store', [{ id: 1 }], transaction);

            try {
              await this.addRecords('store', [{ id: 1 }], transaction);
            } catch (err) {}
          }
        ]);
      } catch (err) {
        notThrown = false;

        assert(/transaction was aborted/.test(err.message), err.message);
      }

      if (notThrown) {
        throw new Error('Not thrown');
      }
    });

    it('should reject migration non-transaction errors', async function () {
      const message = getRandomString();

      try {
        await this.db.migrate([
          () => {
            throw new Error(message);
          }
        ]);
      } catch (err) {
        assert.strictEqual(err.message, message);
      }
    });

    it('should migrate', async function () {
      await this.db.migrate([
        (db) => db.createObjectStore('store', { keyPath: 'id' })
      ]);

      const value = getRandomString();
      const object = {
        id: 1,
        value
      };

      await this.addRecords('store', [object]);

      assert.deepStrictEqual(await this.getAllRecords('store'), [object]);
    });

    it('should apply multiple migrations', async function () {
      await this.db.migrate([
        (db) => db.createObjectStore('store1', { keyPath: 'id' }),
        (db) => db.createObjectStore('store2', { keyPath: 'id' })
      ]);

      const object1 = {
        id: 1,
        value: getRandomString()
      };
      const object2 = {
        id: 1,
        value: getRandomString()
      };

      await Promise.all([
        this.addRecords('store1', [object1]),
        this.addRecords('store2', [object2])
      ]);

      assert.deepStrictEqual(await this.getAllRecords('store1'), [object1]);
      assert.deepStrictEqual(await this.getAllRecords('store2'), [object2]);
    });

    it('should apply asynchronous migrations', async function () {
      const object1 = {
        id: 1,
        value: getRandomString()
      };
      const object2 = {
        id: 2,
        value: getRandomString()
      };

      await this.db.migrate([
        async (db, transaction) => {
          db.createObjectStore('store', { keyPath: 'id' });

          await this.addRecords('store', [object1], transaction);
        },
        async (_db, transaction) => {
          await this.addRecords('store', [object2], transaction);
        }
      ]);

      assert.deepStrictEqual(await this.getAllRecords('store'), [object1, object2]);
    });

    it('should apply migrate multiple times', async function () {
      const object1 = {
        id: 1,
        value: getRandomString()
      };
      const object2 = {
        id: 2,
        value: getRandomString()
      };
      const migrations: Migration[] = [
        async (db, transaction) => {
          db.createObjectStore('store', {
            keyPath: 'id'
          });

          await this.addRecords('store', [object1], transaction);
        }
      ];

      await this.db.migrate(migrations);

      migrations.push(async (_db, transaction) => {
        await this.addRecords('store', [object2], transaction);
      });

      await this.db.migrate(migrations);

      assert.deepStrictEqual(await this.getAllRecords('store'), [object1, object2]);
    });

    it('should do nothing if number of migrations is the same', async function () {
      const object1 = {
        id: 1,
        value: getRandomString()
      };
      const object2 = {
        id: 2,
        value: getRandomString()
      };
      const migrations: Migration[] = [
        async (db, transaction) => {
          db.createObjectStore('store', {
            keyPath: 'id'
          });

          await this.addRecords('store', [object1], transaction);
        },
        async (_db, transaction) => {
          await this.addRecords('store', [object2], transaction);
        }
      ];

      await this.db.migrate(migrations);
      await this.db.migrate(migrations);

      assert.deepStrictEqual(await this.getAllRecords('store'), [object1, object2]);
    });
  });

  it('should close the connection', async function () {
    this.db.close();

    const db = new Database(this.dbName);

    // should succeed
    await db.delete();
  });

  it('should test transactions', async function () {
    await this.db.migrate([
      (db) => db.createObjectStore('store', { keyPath: 'id' })
    ]);

    const marks: number[] = [];

    await Promise.all([
      this.db.transaction('store', 'readwrite', async (transaction) => {
        marks.push(0);

        await this.addRecords('store', [{ id: 1 }], transaction);

        marks.push(2);

        assert.deepStrictEqual(await this.getAllRecords('store', transaction), [{ id: 1 }]);

        marks.push(3);
      }),
      this.db.transaction('store', async (transaction) => {
        marks.push(1);

        assert.deepStrictEqual(await this.getAllRecords('store', transaction), [{ id: 1 }]);

        marks.push(4);
      })
    ]);

    assert.deepStrictEqual(marks, [0, 1, 2, 3, 4]);
  });
});

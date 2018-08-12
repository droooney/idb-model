/* eslint-disable no-use-before-define */
/* eslint-disable spaced-comment */
///<reference types="mocha" />
///<reference path="./hooks.ts" />
/* eslint-enable spaced-comment */
import assert from 'assert';

import { getRandomString, getRandomInteger } from './random';
import { IDBWritableTransaction, Model } from '../src';

describe('Model', () => {
  it('should use default values', () => {
    const name = getRandomString();
    const defaultValue = getRandomString();

    interface UserAttributes {
      id: number;
      name: string;
      job: string;
    }

    interface User extends UserAttributes {}

    class User extends Model<UserAttributes, 'id', 'id' | 'job'> {
      static modelName = 'users';
      static primaryKey = 'id' as 'id';
      static defaultValues = {
        job: defaultValue
      };
    }

    assert.deepStrictEqual(
      new User({ name }).toJSON(),
      { name, job: defaultValue }
    );
  });

  describe('.build', () => {
    it('should build instance', () => {
      const name = getRandomString();

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      const user = User.build({ name });

      assert(user instanceof User);
      assert.deepStrictEqual(user.toJSON(), { name });
    });
  });

  describe('.bulkBuild', () => {
    it('should build multiple instances', () => {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      const users = User.bulkBuild([
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      users.forEach((user) => {
        assert(user instanceof User);
      });
      assert.deepStrictEqual(users.map((user) => user.toJSON()), [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);
    });
  });

  describe('.bulkCreate', () => {
    it('should create instances', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      const [user1, user2, user3] = await User.bulkCreate([
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      assert.deepStrictEqual(user1.toJSON(), { id: 1, name: name1 });
      assert.deepStrictEqual(user2.toJSON(), { id: 2, name: name2 });
      assert.deepStrictEqual(user3.toJSON(), { id: 3, name: name3 });

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();
      const name6 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.bulkCreate([
            { name: name1 },
            { name: name2 }
          ], { transaction });
          await User.bulkCreate([
            { name: name3 },
            { name: name4 }
          ], { transaction });
        }),
        User.bulkCreate([
          { name: name5 },
          { name: name6 }
        ])
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 },
          { id: 4, name: name4 },
          { id: 5, name: name5 },
          { id: 6, name: name6 }
        ]
      );
    });
  });

  describe('.bulkDelete', () => {
    it('should delete instances', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      const [user1, , user3] = await this.getAllRecords('users');

      await User.bulkDelete([
        new User(user1),
        new User(user3)
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 2, name: name2 }]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();
      const name6 = getRandomString();
      const name7 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 },
        { name: name4 },
        { name: name5 },
        { name: name6 },
        { name: name7 }
      ]);

      const [user1, user2, user3, , user5, user6, user7] = await this.getAllRecords('users');

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.bulkDelete([
            new User(user1),
            new User(user5)
          ], { transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [
              { id: 2, name: name2 },
              { id: 3, name: name3 },
              { id: 4, name: name4 },
              { id: 6, name: name6 },
              { id: 7, name: name7 }
            ]
          );

          await User.bulkDelete([
            new User(user3),
            new User(user6)
          ], { transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [
              { id: 2, name: name2 },
              { id: 4, name: name4 },
              { id: 7, name: name7 }
            ]
          );
        }),
        User.bulkDelete([
          new User(user7),
          new User(user2)
        ])
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 4, name: name4 }]
      );
    });
  });

  describe('.bulkSave', () => {
    it('should save multiple records', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      const users = await User.bulkSave([
        new User({ name: name1 }),
        new User({ name: name2 }),
        new User({ name: name3 })
      ]);

      assert.deepStrictEqual(
        users.map((user) => user.toJSON()),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();
      const name6 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.bulkSave([
            new User({ name: name1 }),
            new User({ name: name2 })
          ], { transaction });
          await User.bulkSave([
            new User({ name: name3 }),
            new User({ name: name4 })
          ], { transaction });
        }),
        User.bulkSave([
          new User({ name: name5 }),
          new User({ name: name6 })
        ])
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 },
          { id: 4, name: name4 },
          { id: 5, name: name5 },
          { id: 6, name: name6 }
        ]
      );
    });
  });

  describe('.clear', () => {
    it('should clear store', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      await User.clear();

      assert.deepStrictEqual(await this.getAllRecords('users'), []);
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 }
      ]);

      const [, users] = await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.clear({ transaction });

          assert.deepStrictEqual(await this.getAllRecords('users', transaction), []);

          await this.addRecords('users', [{ name: name3 }], transaction);
        }),
        this.getAllRecords('users')
      ]);

      assert.deepStrictEqual(users, [{ id: 3, name: name3 }]);
    });
  });

  describe('.count', () => {
    it('should count records', async function () {
      const numberOfRecords = getRandomInteger(5, 15);

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords(
        'users',
        new Array(numberOfRecords)
          .fill(0)
          .map(() => ({ name: 'name' }))
      );

      assert.strictEqual(await User.count(), numberOfRecords);
    });

    it('should count records in an empty store', async function () {
      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      assert.strictEqual(await User.count(), 0);
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          assert.strictEqual(await User.count({ transaction }), 0);

          await this.addRecords('users', [{ name: name3 }], transaction);

          assert.strictEqual(await User.count({ transaction }), 1);
        }),
        this.addRecords('users', [
          { name: name1 },
          { name: name2 }
        ])
      ]);

      assert.strictEqual(await User.count(), 3);
    });
  });

  describe('.create', () => {
    it('should create instance', async function () {
      const name = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      const user = await User.create({ name });

      assert.deepStrictEqual(user.toJSON(), { id: 1, name });

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, name }]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.create({ name: name1 }, { transaction });
          await User.create({ name: name2 }, { transaction });
        }),
        User.create({ name: name3 })
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
    });
  });

  describe('.delete', () => {
    it('should delete all records with no filter present', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      await User.delete();

      assert.deepStrictEqual(await this.getAllRecords('users'), []);
    });

    it('should delete records that match filter', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        age: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { age: 33, name: name1 },
        { age: 13, name: name2 },
        { age: 28, name: name3 }
      ]);

      await User.delete(({ age }) => age >= 18);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 2, age: 13, name: name2 }]
      );
    });

    it('should respect Model#beforeDelete', async function () {
      const ctx = this;
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();

      await this.db.migrate([
        (db) => {
          db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true
          });
          db.createObjectStore('items', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
        static fields = ['id', 'name'];

        items: Item[] = [];

        async beforeDelete(transaction: IDBWritableTransaction) {
          await this.getItems(transaction);
          await Promise.all(this.items.map((item) => item.delete({ transaction })));
        }

        async getItems(transaction?: IDBWritableTransaction) {
          const items = (await ctx.getAllRecords('items', transaction)) as ItemAttributes[];

          this.items = items
            .filter(({ ownerId }) => ownerId === this.id)
            .map((item) => new Item(item));
        }
      }

      interface ItemAttributes {
        id: number;
        name: string;
        ownerId?: number;
      }

      interface Item extends ItemAttributes {}

      class Item extends Model<ItemAttributes, 'id', 'id'> {
        static modelName = 'items';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);
      this.db.model(Item);

      await Promise.all([
        this.addRecords('users', [
          { name: name1 },
          { name: name2 }
        ]),
        this.addRecords('items', [
          { name: name3, ownerId: 2 },
          { name: name4, ownerId: 1 },
          { name: name5, ownerId: 2 }
        ])
      ]);

      await User.delete(({ id }) => id === 2, { storeNames: ['items'] });

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, name: name1 }]
      );

      assert.deepStrictEqual(
        await this.getAllRecords('items'),
        [{ id: 2, name: name4, ownerId: 1 }]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        age: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { age: 33, name: name1 },
        { age: 13, name: name2 }
      ]);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.delete(({ age }) => age >= 18, { transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [{ id: 2, age: 13, name: name2 }]
          );

          await User.delete(({ age }) => age >= 18, { transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [{ id: 2, age: 13, name: name2 }]
          );
        }),
        this.addRecords('users', [{ age: 28, name: name3 }])
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 2, age: 13, name: name2 },
          { id: 3, age: 28, name: name3 }
        ]
      );
    });
  });

  describe('.findAll', () => {
    it('should find all records with no filter present', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      assert.deepStrictEqual(
        (await User.findAll()).map((user) => user.toJSON()),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
    });

    it('should find records with filter', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        age: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { age: 33, name: name1 },
        { age: 13, name: name2 },
        { age: 28, name: name3 }
      ]);

      assert.deepStrictEqual(
        (await User.findAll(({ age }) => age >= 18)).map((user) => user.toJSON()),
        [
          { id: 1, age: 33, name: name1 },
          { id: 3, age: 28, name: name3 }
        ]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await this.addRecords('users', [{ name: name1 }], transaction);

          assert.deepStrictEqual(
            (await User.findAll(null, { transaction })).map((user) => user.toJSON()),
            [{ id: 1, name: name1 }]
          );

          await this.addRecords('users', [{ name: name2 }], transaction);

          assert.deepStrictEqual(
            (await User.findAll(null, { transaction })).map((user) => user.toJSON()),
            [
              { id: 1, name: name1 },
              { id: 2, name: name2 }
            ]
          );
        }),
        this.addRecords('users', [{ name: name3 }])
      ]);

      assert.deepStrictEqual(
        (await User.findAll()).map((user) => user.toJSON()),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
    });
  });

  describe('.findOne', () => {
    it('should find first record with no filter present', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      const user = await User.findOne();

      assert(user instanceof User);
      assert.deepStrictEqual(user!.toJSON(), { id: 1, name: name1 });
    });

    it('should find first record that matches the filter', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      const user = await User.findOne(({ id }) => id === 2);

      assert(user instanceof User);
      assert.deepStrictEqual(user!.toJSON(), { id: 2, name: name2 });
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await this.addRecords('users', [{ name: name1 }], transaction);

          const user1 = await User.findOne(({ id }) => id === 1, { transaction });

          assert(user1 instanceof User);
          assert.deepStrictEqual(user1!.toJSON(), { id: 1, name: name1 });
          assert.strictEqual(await User.findOne(({ id }) => id === 2, { transaction }), null);

          await this.addRecords('users', [{ name: name2 }], transaction);

          const user2 = await User.findOne(({ id }) => id === 2, { transaction });

          assert(user2 instanceof User);
          assert.deepStrictEqual(user2!.toJSON(), { id: 2, name: name2 });
        }),
        this.addRecords('users', [{ name: name3 }])
      ]);

      const user3 = await User.findOne(({ id }) => id === 3);

      assert(user3 instanceof User);
      assert.deepStrictEqual(user3!.toJSON(), { id: 3, name: name3 });
    });
  });

  describe('.findByPrimary', () => {
    it('should find by primary key', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 }
      ]);

      const [user1, user2, user3] = await Promise.all([
        User.findByPrimary(1),
        User.findByPrimary(2),
        User.findByPrimary(3)
      ]);

      assert(user1 instanceof User);
      assert(user2 instanceof User);
      assert.strictEqual(user3, null);

      assert.deepStrictEqual(user1!.toJSON(), { id: 1, name: name1 });
      assert.deepStrictEqual(user2!.toJSON(), { id: 2, name: name2 });
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await this.addRecords('users', [{ name: name1 }], transaction);

          const user1 = await User.findByPrimary(1, { transaction });

          assert(user1 instanceof User);
          assert.deepStrictEqual(user1!.toJSON(), { id: 1, name: name1 });
          assert.strictEqual(await User.findByPrimary(2, { transaction }), null);

          await this.addRecords('users', [{ name: name2 }], transaction);

          const user2 = await User.findByPrimary(2, { transaction });

          assert(user2 instanceof User);
          assert.deepStrictEqual(user2!.toJSON(), { id: 2, name: name2 });
        }),
        this.addRecords('users', [{ name: name3 }])
      ]);

      const user3 = await User.findByPrimary(3);

      assert(user3 instanceof User);
      assert.deepStrictEqual(user3!.toJSON(), { id: 3, name: name3 });
    });
  });

  describe('.update', () => {
    it('should update all records with no filter present', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      await User.update({ name: name4 });

      assert.deepStrictEqual(await this.getAllRecords('users'), [
        { id: 1, name: name4 },
        { id: 2, name: name4 },
        { id: 3, name: name4 }
      ]);
    });

    it('should update records that match filter', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        age: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { age: 33, name: name1 },
        { age: 13, name: name2 },
        { age: 28, name: name3 }
      ]);

      await User.update({ name: name4 }, ({ age }) => age >= 18);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, age: 33, name: name4 },
          { id: 2, age: 13, name: name2 },
          { id: 3, age: 28, name: name4 }
        ]
      );
    });

    it('should update records with callback', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        age: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { age: 33, name: name1 },
        { age: 13, name: name2 },
        { age: 28, name: name3 }
      ]);

      await User.update((user) => user.name = name4, ({ age }) => age >= 18);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, age: 33, name: name4 },
          { id: 2, age: 13, name: name2 },
          { id: 3, age: 28, name: name4 }
        ]
      );
    });

    it('should respect Model#beforeSave', async function () {
      const ctx = this;
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();
      const name6 = getRandomString();
      const name7 = getRandomString();

      await this.db.migrate([
        (db) => {
          db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true
          });
          db.createObjectStore('items', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
        static fields = ['id', 'name'];

        items: Item[] = [];

        async beforeSave(transaction: IDBWritableTransaction) {
          await this.getItems(transaction);
          await Promise.all(this.items.map((item) => {
            item.name = name7;

            return item.save({ transaction });
          }));
        }

        async getItems(transaction?: IDBWritableTransaction) {
          const items = (await ctx.getAllRecords('items', transaction)) as ItemAttributes[];

          this.items = items
            .filter(({ ownerId }) => ownerId === this.id)
            .map((item) => new Item(item));
        }
      }

      interface ItemAttributes {
        id: number;
        name: string;
        ownerId?: number;
      }

      interface Item extends ItemAttributes {}

      class Item extends Model<ItemAttributes, 'id', 'id'> {
        static modelName = 'items';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);
      this.db.model(Item);

      await Promise.all([
        this.addRecords('users', [
          { name: name1 },
          { name: name2 }
        ]),
        this.addRecords('items', [
          { name: name3, ownerId: 2 },
          { name: name4, ownerId: 1 },
          { name: name5, ownerId: 2 }
        ])
      ]);

      await User.update({ name: name6 }, ({ id }) => id === 2, { storeNames: ['items'] });

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name6 }
        ]
      );

      assert.deepStrictEqual(
        await this.getAllRecords('items'),
        [
          { id: 1, name: name7, ownerId: 2 },
          { id: 2, name: name4, ownerId: 1 },
          { id: 3, name: name7, ownerId: 2 }
        ]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        age: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { age: 33, name: name1 },
        { age: 13, name: name2 }
      ]);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await User.update({ name: name4 }, ({ age }) => age >= 18, { transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [
              { id: 1, age: 33, name: name4 },
              { id: 2, age: 13, name: name2 }
            ]
          );

          await User.update({ name: name5 }, ({ age }) => age >= 18, { transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [
              { id: 1, age: 33, name: name5 },
              { id: 2, age: 13, name: name2 }
            ]
          );
        }),
        this.addRecords('users', [{ age: 28, name: name3 }])
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, age: 33, name: name5 },
          { id: 2, age: 13, name: name2 },
          { id: 3, age: 28, name: name3 }
        ]
      );
    });
  });

  describe('#delete', () => {
    it('should do nothing if there is no primary key', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 }
      ]);

      await new User({ name: name2 }).delete();

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 }
        ]
      );
    });

    it('should respect Model#beforeDelete', async function () {
      const ctx = this;
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();

      await this.db.migrate([
        (db) => {
          db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true
          });
          db.createObjectStore('items', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';

        items: Item[] = [];

        async beforeDelete(transaction: IDBWritableTransaction) {
          await Promise.all(this.items.map((item) => item.delete({ transaction })));
        }

        async getItems() {
          const items = (await ctx.getAllRecords('items')) as ItemAttributes[];

          this.items = items
            .filter(({ ownerId }) => ownerId === this.id)
            .map((item) => new Item(item));
        }
      }

      interface ItemAttributes {
        id: number;
        name: string;
        ownerId?: number;
      }

      interface Item extends ItemAttributes {}

      class Item extends Model<ItemAttributes, 'id', 'id'> {
        static modelName = 'items';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);
      this.db.model(Item);

      await Promise.all([
        this.addRecords('users', [
          { name: name1 },
          { name: name2 }
        ]),
        this.addRecords('items', [
          { name: name3, ownerId: 2 },
          { name: name4, ownerId: 1 },
          { name: name5, ownerId: 2 }
        ])
      ]);

      const [, userAttributes2] = await this.getAllRecords('users');
      const user2 = new User(userAttributes2);

      await user2.getItems();
      await user2.delete({ storeNames: ['items'] });

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, name: name1 }]
      );

      assert.deepStrictEqual(
        await this.getAllRecords('items'),
        [{ id: 2, name: name4, ownerId: 1 }]
      );
    });

    it('should delete instances', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 }
      ]);

      const [, user2] = await this.getAllRecords('users');

      await new User(user2).delete();

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 3, name: name3 }
        ]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 },
        { name: name2 },
        { name: name3 },
        { name: name4 }
      ]);

      const [user1, , user3, user4] = await this.getAllRecords('users');

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await new User(user3).delete({ transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [
              { id: 1, name: name1 },
              { id: 2, name: name2 },
              { id: 4, name: name4 }
            ]
          );

          await new User(user1).delete({ transaction });

          assert.deepStrictEqual(
            await this.getAllRecords('users', transaction),
            [
              { id: 2, name: name2 },
              { id: 4, name: name4 }
            ]
          );
        }),
        new User(user4).delete()
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 2, name: name2 }]
      );
    });
  });

  describe('#save', () => {
    it('should add record if no primary key present', async function () {
      const name = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      const user = await new User({ name }).save();

      assert.deepStrictEqual(user.toJSON(), { id: 1, name });
      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, name }]
      );
    });

    it('should update the record if primary key is present', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await this.addRecords('users', [
        { name: name1 }
      ]);

      await new User({ id: 1, name: name2 }).save();

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, name: name2 }]
      );
    });

    it('should respect Model#beforeSave', async function () {
      const ctx = this;
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();
      const name4 = getRandomString();
      const name5 = getRandomString();
      const name6 = getRandomString();
      const name7 = getRandomString();
      const name8 = getRandomString();

      await this.db.migrate([
        (db) => {
          db.createObjectStore('users', {
            keyPath: 'id',
            autoIncrement: true
          });
          db.createObjectStore('items', {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
        static fields = ['id', 'name'];

        items: Item[] = [];

        async beforeSave(transaction: IDBWritableTransaction) {
          await Promise.all(this.items.map((item) => item.save({ transaction })));
        }

        async getItems() {
          const items = (await ctx.getAllRecords('items')) as ItemAttributes[];

          this.items = items
            .filter(({ ownerId }) => ownerId === this.id)
            .map((item) => new Item(item));
        }
      }

      interface ItemAttributes {
        id: number;
        name: string;
        ownerId?: number;
      }

      interface Item extends ItemAttributes {}

      class Item extends Model<ItemAttributes, 'id', 'id'> {
        static modelName = 'items';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);
      this.db.model(Item);

      await Promise.all([
        this.addRecords('users', [
          { name: name1 },
          { name: name2 }
        ]),
        this.addRecords('items', [
          { name: name3, ownerId: 2 },
          { name: name4, ownerId: 1 },
          { name: name5, ownerId: 2 }
        ])
      ]);

      const [, userAttributes2] = await this.getAllRecords('users');
      const user2 = new User(userAttributes2);

      await user2.getItems();

      assert.strictEqual(user2.items.length, 2);

      [user2.name, user2.items[0].name, user2.items[1].name] = [name6, name7, name8];

      await user2.save({ storeNames: ['items'] });

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name6 }
        ]
      );

      assert.deepStrictEqual(
        await this.getAllRecords('items'),
        [
          { id: 1, name: name7, ownerId: 2 },
          { id: 2, name: name4, ownerId: 1 },
          { id: 3, name: name8, ownerId: 2 }
        ]
      );
    });

    it('should respect Model#toJSON', async function () {
      const firstName1 = getRandomString();
      const lastName1 = getRandomString();
      const firstName2 = getRandomString();
      const lastName2 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        firstName: string;
        lastName: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';

        toJSON() {
          const json: any = {
            firstName: this.firstName,
            lastName: this.lastName
          };

          if ('id' in this) {
            json.id = this.id;
          }

          return json;
        }

        fullName = `${this.firstName} ${this.lastName}`;
      }

      this.db.model(User);

      let user = new User({
        firstName: firstName1,
        lastName: lastName1
      });

      assert.strictEqual(user.fullName, `${firstName1} ${lastName1}`);

      await user.save();

      const users = await this.getAllRecords('users');

      assert.deepStrictEqual(
        users,
        [{ id: 1, firstName: firstName1, lastName: lastName1 }]
      );

      user = new User({
        ...users[0],
        firstName: firstName2,
        lastName: lastName2
      });

      assert.strictEqual(user.fullName, `${firstName2} ${lastName2}`);

      await user.save();

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, firstName: firstName2, lastName: lastName2 }]
      );
    });

    it('should respect Model.fields', async function () {
      const firstName = getRandomString();
      const lastName = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        firstName: string;
        lastName: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
        static fields = ['id', 'firstName', 'lastName'];

        fullName = `${this.firstName} ${this.lastName}`;
      }

      this.db.model(User);

      await new User({ firstName, lastName }).save();

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [{ id: 1, firstName, lastName }]
      );
    });

    it('should support transactions', async function () {
      const name1 = getRandomString();
      const name2 = getRandomString();
      const name3 = getRandomString();

      await this.db.migrate([
        (db) => db.createObjectStore('users', {
          keyPath: 'id',
          autoIncrement: true
        })
      ]);

      interface UserAttributes {
        id: number;
        name: string;
      }

      interface User extends UserAttributes {}

      class User extends Model<UserAttributes, 'id', 'id'> {
        static modelName = 'users';
        static primaryKey = 'id' as 'id';
      }

      this.db.model(User);

      await Promise.all([
        this.db.transaction('users', 'readwrite', async (transaction) => {
          await new User({ name: name1 }).save({ transaction });
          await new User({ name: name2 }).save({ transaction });
        }),
        new User({ name: name3 }).save()
      ]);

      assert.deepStrictEqual(
        await this.getAllRecords('users'),
        [
          { id: 1, name: name1 },
          { id: 2, name: name2 },
          { id: 3, name: name3 }
        ]
      );
    });
  });
});

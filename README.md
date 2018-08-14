# idb-model

Small and simple model-based IndexedDB wrapper.

## What for?

If you have ever dealt with IndexedDB, you've probably noticed that its API is not really usable in the modern world of promises and `async` functions.
This library is designed the way that you wouldn't need to touch the weird native API.
If you only need a promise wrapper for the native API or a simple key-val store, you can take a look at [idb](https://www.npmjs.com/package/idb) or [idb-keyval](https://www.npmjs.com/package/idb-keyval).
If you need something more advanced `idb-model` is what you need.

## Usage

The library consists of two classes: `Database` and `Model`. You migrate the database and perform transaction through an instance of `Database` and you manage records in an object store through your custom subclasses of `Model` (if you're familiar with [sequelize](https://www.npmjs.com/package/sequelize) this should be easy to understand as `idb-model` is inspired by it).

### Database

This class is responsible for connecting to the database and opening transactions to it.

##### new Database(name, [options])

* name - database name.
* options (optional):
  * options.transactionMode (optional) - is either `"readonly"` or `"readwrite"` - default level for [Database#transaction](#databasetransactionstorenames-mode-callback). Default is `"readonly"`.
  * options.onBlocked (optional) - is just passed to [this](https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onblocked).
  * options.onVersionChange (optional) - is just passed to [this](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/onversionchange).

#### Instance methods

##### Database#close()

Closes the connection.

```js
db.close();
```

##### Database#delete()

Deletes the database. Returns `Promise`.

```js
(async () => {
  await db.delete();
})();
```

##### Database#getConnection()

Returns `Promise` resolved with the instance of [IDBDatabase](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase).
Used primarily internally, and you probably wouldn't need this in most cases, but if you need to access the native API use this method.

```js
(async () => {
  const connection = await db.getConnection();

  console.assert(connection instanceof IDBDatabase);
})();
```

##### Database#migrate(migrations)

* migrations (required) - An array of functions (may be async) that take two arguments:
  * db - an [IDBDatabase](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase) instance.
  * transaction - a version change [transaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction). You can pass it to any `Model` method that accepts transaction.

Returns `Promise`.

Use this function to migrate between different versions of your database.

**Note:** if a migration is an `async` function you can't really fetch resources or perform any other non-idb-related async actions because IndexedDB transactions auto-close when there is nothing to do.
But you can `await` some `Model` methods, but **only** if you're passing the `transaction` parameter to them.
Also if you're going to use some native transaction API in a migration, use only the `transaction` from the parameter.
For example:

```js
const db = new Database('db');

class User extends Model {
  static modelName = 'users';
  static primaryKey = 'id';
}

db.model(User);

(async () => {
  await db.migrate([
    (db) => {
      db.createObjectStore('users', {
        keyPath: 'id',
        autoIncrement: true
      });
    },
    async (db, transaction) => {
      // splits fullName into firstName and lastName

      await User.update((user) => {
        [user.firstName, user.lastName] = user.fullName.split(' ');

        delete user.fullName;
      }, { transaction });
    }
  ]);
})();
```

##### Database#model(model)

* model (required) - a subclass of `Model`.

Attaches `model` to the database instance.

```js
class User extends Model {
  static modelName = 'users';
  static primaryKey = 'id';
}

db.model(User);
```

##### Database#transaction(storeNames[, mode], callback)

* storeNames (required) - a string or string array of store names that this transaction is using.
* mode (optional) - `"readonly"` or `"readwrite"`. If not specified then `db.transactionMode` is used that was specified when creating the database.
* callback (required) - function that takes [transaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction) argument that can then be passed to any `Model` method.

Returns `Promise` resolved with the return value of callback when the transaction is completed.

Performs a transaction to the database.

**Note:** Don't `await` asynchronous actions inside the callback before doing something with `transaction` as the transaction completes when there's nothing to do. Example:

```js
const db = new Database('db', {
  transactionMode: 'readwrite'
});

class User extends Model {
  static modelName = 'users';
  static primaryKey = 'id';
}

async function pay(payer, receiver, amount) {
  const result = await db.transaction('users', async (transaction) => {
    const payerFromDb = await User.findByPrimary(payer.id, { transaction });

    if (payerFromDb.balance < amount) {
      return false;
    }

    const receiverFromDb = await User.findByPrimary(receiver.id, { transaction });

    receiverFromDb.balance += amount;
    payerFromDb.balance -= amount;

    await User.bulkSave([payerFromDb, receiverFromDb], { transaction });

    return true;
  });

  console.log(result);
}
```

### Model

To manage records in an object store use this class, but not directly - only through your custom subclasses. Example:

```js
class User extends Model {
  static modelName = 'users';
  static primaryKey = 'id';
}

const user = new User({
  name: 'John',
  age: 30
});

(async () => {
  await user.save();
})();
```

##### new Model(values)

* values (required) - object with values of the instance. `Model.defaultValues` is assigned to the instance before them.

#### Static fields

* modelName (required): used to select `objectStore` from the database.
* primaryKey (required): for now `save` and `delete` operations are primary-key-based, so that all of your models have to have a primary key.
* fields (optional): an array of instance fields to save. By default all instance enumerable fields are saved. You can use this field to filter out the fields that don't need to be stored. To customize stored fields more use [Model#toJSON hook](#modeltojson).
* defaultValues (optional): an object with default values.

#### Static methods

##### Model.build(values)
##### Model.bulkBuild(values[])

* values (required) - object with values of the instance.

Returns new instance (array of instances for `bulkBuild`).

Alias of `new Model(values)`.

```js
const user = User.build({
  name: 'John',
  age: 30
});
const users = User.bulkBuild([
  { name: 'John', age: 30 },
  { name: 'Jack', age: 25 }
]);
```

##### Model.clear([options])

* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.

Clears the object store. Returns `Promise`.

```js
(async () => {
  await User.clear();
})();
```

##### Model.count([options])

* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.

Counts the records in the object store. Returns `Promise` resolved with the number of records.

```js
(async () => {
  console.log('number of users', await User.count());
})();
```

##### Model.create(values[, options])
##### Model.bulkCreate(values[][, options])

* values (required) - object with values of the instance.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.
  * options.storeNames (optional) - an array of object stores, that may be needed for [beforeSave](#modelbeforesavetransaction-options) hook.

Creates the instance(s) using `values` and saves it (them) in the object store right away.
Assigns the new primary key value to the instance after save.
Returns `Promise` resolved with the instance(s). (In `bulkCreate` all records are created in one transaction).

```js
(async () => {
  const user = await User.create({
    name: 'John',
    age: 30
  });

  // in case primary key is 'id'
  console.log('user id', user.id);
  console.log(user);

  const users = await User.bulkCreate([
    { name: 'John', age: 30 },
    { name: 'Jack', age: 25 }
  ]);

  console.log(users);
})();
```

##### Model.delete([filter][, options])

* filter (optional) - callback that takes an instance. If returns truthy value then the record is deleted, otherwise not.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.
  * options.storeNames (optional) - an array of object stores, that may be needed for [beforeDelete](#modelbeforedeletetransaction-options) hook.

Deletes records that match the filter. If no filter specified, all records are deleted. Returns `Promise` resolved with the deleted instances.

```js
(async () => {
  // deletes all records
  await User.delete();

  // deletes all records that have age < 20
  await User.delete(({ age }) => age < 20);
})();
```

##### Model.bulkDelete(instances[, options])

* instances (required) - an array of instances of the model to delete.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.
  * options.storeNames (optional) - an array of object stores, that may be needed for [beforeDelete](#modelbeforedeletetransaction-options) hook.

Returns `Promise` resolved with the instances.
Deletes instances from the object store.
Under the hood just calls [delete method](#modeldeleteoptions) for each instance.
The main difference is that all records are deleted in one transaction.

```js
(async () => {
  const users = await User.bulkCreate([
    { name: 'John', age: 30 },
    { name: 'Jack', age: 25 }
  ]);

  await User.bulkDelete(users);
})();
```

##### Model.findAll([filter][, options])

* filter (optional) - callback that takes an instance. If returns truthy value then the record is included, otherwise not.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.

```js
(async () => {
  const users = await User.findAll(({ age }) => age < 20);

  console.log(users);
})();
```

Returns `Promise` resolved with an array of instances that match the filter. If no filter specified, all records are included.

##### Model.findOne([filter][, options])

* filter (optional) - callback that takes an instance. If returns truthy value then this record is returned.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.

```js
(async () => {
  const user = await User.findOne(({ name }) => name === 'John');

  console.log(user);
})();
```

Returns `Promise` resolved with the first instance that matches the filter or `null` if no records match the filter.

##### Model.findByPrimary(primary[, options])

* primary (required) - value of the primary key field of the record to find.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.

```js
(async () => {
  const user = await User.findByPrimary(1);

  console.log(user);
})();
```

Returns `Promise` resolved with the instance that matches `primary` or null if no records match.

##### Model.bulkSave(instances[, options])

* instances (required) - an array of instances of the model to save.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.

```js
(async () => {
  const users = await User.bulkCreate([
    { name: 'John', age: 30 },
    { name: 'Jack', age: 25 }
  ]);

  users.forEach((user) => user.age += 1);

  await User.bulkSave(users);
})();
```

Saves multiple instances in one transaction. Returns `Promise` resolved with the instances.

##### Model.update(values[filter][, options])

* values (required) - either an object with fields to update or a callback that is called with an instance to update. In case of callback **don't** return a new value, rather modify the instance.
* filter (optional) - callback that takes an instance. If returns truthy value then the record is updated, otherwise not.
* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.
  * options.storeNames (optional) - an array of object stores, that may be needed for [beforeSave](#modelbeforesavetransaction-options) hook.

Updates records that match the filter. If no filter specified, all records are updated. Returns `Promise` resolved with the updated instances.

```js
(async () => {
  // increments age by 1 in all records
  await User.update((user) => user.age += 1);

  // increments age by 1 in all records that have age < 20
  await User.update(
    (user) => user.age += 1,
    ({ age }) => age < 20
  );

  // sets age to 1 in all records that have age < 20
  await User.update(
    { age: 1 },
    ({ age }) => age < 20
  );
})();
```

#### Instance methods

##### Model#delete([options])

* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.
  * options.storeNames (optional) - an array of object stores, that may be needed for [beforeDelete](#modelbeforedeletetransaction-options) hook.

Deletes the record using the primary key.
If the instance doesn't have the primary key field, then the method does nothing.
Returns `Promise` resolved with the instance.

```js
(async () => {
  const user = await User.findByPrimary(1);

  await user.delete();
})();
```

##### Model#save([options])

* options (optional):
  * options.transaction (optional) - if present, the operation is performed in this transaction.
  * options.storeNames (optional) - an array of object stores, that may be needed for [beforeSave](#modelbeforesavetransaction-options) hook.

Saves the record using the primary key.
The record is updated if the instance has the primary key field, otherwise the record is added.
Returns `Promise` resolved with the instance.

```js
(async () => {
  // update
  const user = await User.findByPrimary(1);

  user.age += 1;

  await user.save();

  // create
  const user = new User({
    name: 'John',
    age: 30
  });

  await user.save();
})();
```

### Hooks

##### Model#beforeDelete(transaction, options)

* transaction - the transaction which deletes the record.
* options - the options with which a delete method was called.

Set this method in your model to add some operations before the record is deleted using [Model.delete](#modeldeletefilter-options), [Model.bulkDelete](#modelbulkdeleteinstances-options) or [Model#delete](#modeldeleteoptions).
The method may be asynchronous, though you should perform only asynchronous actions related to the `transaction`.
`options.storeNames` from delete methods is used to open a delete transaction, so that if you need to do something involving other stores in the hook, specify `options.storeNames` in the corresponding delete method.

##### Model#beforeSave(transaction, options)

* transaction - the transaction which deletes the record.
* options - the options with which a save (or update) method was called.

Set this method in your model to add some operations before the record is saved using [Model.create](#modelcreatevalues-options), [Model.bulkCreate](#modelbulkcreatevalues-options), [Model.bulkSave](#modelbulksaveinstances-options), [Model.update](#modelupdatevaluesfilter-options) or [Model#save](#modelsaveoptions).
The method may be asynchronous, though you should perform only asynchronous actions related to the `transaction`.
`options.storeNames` from save (or update) methods is used to open a save transaction, so that if you need to do something involving other stores in the hook, specify `options.storeNames` in the corresponding save (or update) method.

##### Model#toJSON()

Set this method in your model to customize what is saved to the database returning the desired object.
If this method is specified `Model.fields` is not used.

## Typescript Usage

Here is an example of a user model:

```typescript
// you need to create a separate interface to pass it to Model
interface UserAttributes {
  id: number;
  name: string;
  age: number;
  job: string;
}

// you need User to extend UserAttributes, so that you can access your custom fields
interface User extends UserAttributes {}

// first argument is values interface
// second argument is optional fields that are not necessary to set when creating an instance
class User extends Model<UserAttributes, 'id' | 'job'> {
  static modelName = 'users';
  // this is a hack so that ts recognizes 'id' as a key of User
  static primaryKey = 'id' as 'id';
  // you need to set default values for optional parameters here, except the primaryKey field - this and required fields are optional here
  static defaultValues = {
    job: ''
  };
}
```

## Conclusion

1. Also the library exports a small helper - `promisifyRequest`, that takes an [IDBRequest](https://developer.mozilla.org/en-US/docs/Web/API/IDBRequest) instance and "promisifies" it:

    ```
    promisifyRequest(request[, defaultValue])
    ```

    Returns a `Promise` resolved with the request result or `defaultValue`. Use this helper if you need some native API requests to be promisified.

2. For now `idb-model` doesn't support [IDBKeyRange API](https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange), [IDBIndex API](https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex) and [IDBCursor API](https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor).
Although the first one and the second one may be useful together, the third one does not seem very useful considering that it's already used internally in some `Model` methods.

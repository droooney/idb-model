import { Model } from './Model';
import { Migration } from './Database';

export const VERSION_OBJECT_STORE_NAME = '__version__';

export const versionMigration: Migration = (db) => {
  /* istanbul ignore else */
  if (!db.objectStoreNames.contains(VERSION_OBJECT_STORE_NAME)) {
    db.createObjectStore(VERSION_OBJECT_STORE_NAME, {
      keyPath: 'id',
      autoIncrement: false
    });
  }
};

interface VersionAttributes {
  id: number;
  version: number;
}

// eslint-disable-next-line no-use-before-define
export interface Version extends VersionAttributes {}

export class Version extends Model<VersionAttributes, 'id'> {
  static modelName = VERSION_OBJECT_STORE_NAME;
  static primaryKey = 'id' as 'id';
}

import { Model } from './Model';
import { Migration } from './Database';

export const VERSION_OBJECT_STORE_NAME = '__version__';

export const versionMigration: Migration = (db) => {
  try {
    db.createObjectStore(VERSION_OBJECT_STORE_NAME, {
      keyPath: 'id',
      autoIncrement: false
    });
  } catch (err) {}
};

interface IVersion {
  id: number;
  version: number;
}

// eslint-disable-next-line no-use-before-define
export interface Version extends IVersion {}

export class Version extends Model<IVersion> {
  static modelName = VERSION_OBJECT_STORE_NAME;
  static fields = ['id', 'version'];
}

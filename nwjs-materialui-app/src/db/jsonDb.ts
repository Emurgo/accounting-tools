import { JsonDB, Config } from 'node-json-db';

const db = new JsonDB(new Config("myDatabase", true, false, '/'));

export default db;
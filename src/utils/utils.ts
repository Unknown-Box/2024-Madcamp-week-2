import { createHash } from 'crypto';
import { Database } from 'sqlite3';

export function SHA256B64(msg: string) {
  return createHash('sha256').update(msg).digest('base64');
}

export class DBHander {
  static _db: Database | null = null;

  get db(): Database {
    if (DBHander._db != null)
      return DBHander._db;

    const db = new Database(':memory:');
    const initData = [
      {
        type: 'student',
        email: 'psw030125@gmail.com',
        password: 'NJs8zLWOEnYA0krl+V6TeKVWn8AsiAh6xhXveji5ZrM=',
        displayName: 'Sangwoo Park'
      },
      {
        type: 'expert',
        email: 'didtpgml0627@gmail.com',
        password: 'NJs8zLWOEnYA0krl+V6TeKVWn8AsiAh6xhXveji5ZrM=',
        displayName: '양세희'
      }
    ];

    db.serialize(function() {
      db.run(`
        CREATE TABLE "Users" (
          "id"	INTEGER,
          "type"	TEXT NOT NULL,
          "email"	TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "display_name"	TEXT NOT NULL,
          "is_deleted"	INTEGER NOT NULL DEFAULT 0,
          "created_at"	INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at"	INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY("id")
        )`
      );
      for (let record of initData) {
        db.run(
          `INSERT INTO "Users" (
            "type",
            "email",
            "password",
            "display_name"
          ) VALUES (
            ?,
            ?,
            ?,
            ?
          )`,
          [
            record.type,
            record.email,
            record.password,
            record.displayName
          ]
        );
      }
    });

    DBHander._db = db;

    return db;
  }
}

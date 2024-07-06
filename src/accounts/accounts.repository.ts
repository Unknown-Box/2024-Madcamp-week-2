import { Database } from 'sqlite3';
import { Injectable } from "@nestjs/common";
import { SHA256B64 } from 'src/utils/utils';

@Injectable()
export class AccountsRepository {
  private static _db: Database | null = null;

  constructor() {}

  get db(): Database {
    if (AccountsRepository._db != null)
      return AccountsRepository._db;

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

    AccountsRepository._db = db;

    return db;
  }

  private encryptPassword(password: string) {
    const salt = process.env.ENC_PASSWORD_SALT;
    return SHA256B64(`${salt}-${password}`);
  }

  getUserByEmail(email: string): Promise<any | null> {
    const db = this.db;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM "Users" WHERE email=?`,
        [ email ],
        function(err, row) {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          resolve(row);
        }
      );
    });
  }

  getUserByEmailPassword(email: string, password: string): Promise<any | null> {
    const db = this.db;
    console.log(email, this.encryptPassword(password));

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM "Users" WHERE email=? AND password=?`,
        [
          email,
          this.encryptPassword(password)
        ],
        function(err, row) {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          resolve(row);
        }
      );
    });
  }

  createUser(
    type: 'expert' | 'student',
    email: string,
    password: string,
    displayName: string
  ): Promise<boolean> {
    const db = this.db;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO "Users" (
          type,
          email,
          password,
          display_name
        ) VALUES (
          ?,
          ?,
          ?,
          ?
        );`,
        [
          type,
          email,
          this.encryptPassword(password),
          displayName
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          db.all(
            `SELECT * FROM "Users";`,
            (err, rows) => {
              if (err) {
                console.error(err);
                return;
              }

              console.log(rows);

              resolve(!!this.lastID);
            }
          )

          // resolve(!!this.lastID);
        }
      );
    });
  }
}
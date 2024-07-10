import { Injectable } from "@nestjs/common";
import { DBHandler, SHA256B64 } from 'src/utils/utils';

@Injectable()
export class AccountsRepository {

  private encryptPassword(password: string) {
    const salt = process.env.ENC_PASSWORD_SALT;
    return SHA256B64(`${salt}-${password}`);
  }

  getUserByEmail(email: string): Promise<any | null> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM "Users" WHERE email=? AND is_deleted=0`,
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
    const db = new DBHandler().db;
    console.log(email, this.encryptPassword(password));

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM "Users" WHERE email=? AND password=? AND is_deleted=0`,
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
    const db = new DBHandler().db;

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
          );
        }
      );
    });
  }
}
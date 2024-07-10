import { createHash } from 'crypto';
import { Database } from 'sqlite3';
import { S3Client } from "@aws-sdk/client-s3";
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export function SHA256B64(msg: string) {
  return createHash('sha256').update(msg).digest('base64');
}

export function authorize(jwtService: JwtService, token: string | null) {
  const tokenPrefix = 'Bearer ';
  if (!token || !token.startsWith(tokenPrefix)) {
    throw new UnauthorizedException();
  }

  try {
    const _token = token.substring(tokenPrefix.length);
    return jwtService.verify(_token);
  } catch(e) {
    console.error(e);
    throw new ForbiddenException();
  }
}

export function validateId(id: string): [number, boolean] {
  const _id = parseInt(id);

  return [
    _id,
    Number.isInteger(_id)
  ];
}

export function validateInt(num: string): [number, boolean] {
  const int = parseInt(num);
  return [
    int,
    Number.isInteger(int)
  ]
}

export function validateDatetime(datetime: string): [number, boolean] {
  const militimestamp = Date.parse(datetime);

  return [
    Math.floor(militimestamp / 1000),
    Number.isInteger(militimestamp)
  ];
}

export class DBHandler {
  static _db: Database | null = null;
  static _mutex = { isOccupied: false };

  get db(): Database {
    if (DBHandler._db != null)
      return DBHandler._db;

    const db = new Database(':memory:');
    const [ numDemoStd ] = [ 32 ];
    const initialUsers = [
      {
        type: 'student',
        email: 'student@example.com',
        password: 'NJs8zLWOEnYA0krl+V6TeKVWn8AsiAh6xhXveji5ZrM=',
        displayName: 'student'
      },
      {
        type: 'expert',
        email: 'expert@example.com',
        password: 'NJs8zLWOEnYA0krl+V6TeKVWn8AsiAh6xhXveji5ZrM=',
        displayName: 'expert'
      },
      ...[...Array(numDemoStd).keys()].map(i => ({
        type: 'student',
        email: `student-${i}@example.com`,
        password: 'NJs8zLWOEnYA0krl+V6TeKVWn8AsiAh6xhXveji5ZrM=',
        displayName: `student-${i}`
      })),
      ...require('../../data/data.json').map(({ name }) => ({
        type: 'expert',
        email: `${Buffer.from(name).toString('base64url')}@example.com`,
        password: 'NJs8zLWOEnYA0krl+V6TeKVWn8AsiAh6xhXveji5ZrM=',
        displayName: name
      }))
    ];

    db.serialize(function() {
      db.run(`
        CREATE TABLE "Users" (
          "id" INTEGER,
          "type" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "display_name" TEXT NOT NULL,
          "is_deleted" INTEGER NOT NULL DEFAULT 0,
          "created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY("id")
        )`
      );
      db.run(`
        CREATE TABLE "Courses" (
          "id" INTEGER,
          "owner" INTEGER NOT NULL,
          "title" TEXT NOT NULL,
          "summary" TEXT NOT NULL,
          "details" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "date" INTEGER NOT NULL,
          "contact" TEXT NOT NULL,
          "location" TEXT NOT NULL,
          "price" INTEGER NOT NULL,
          "max_participants" INTEGER NOT NULL,
          "is_deleted" INTEGER NOT NULL DEFAULT 0,
          "created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY("id")
        )`
      );
      db.run(`
        CREATE TABLE "CourseImages" (
          "id" INTEGER,
          "course_id" INTEGER NOT NULL,
          "idx" INTEGER NOT NULL,
          "url" TEXT NOT NULL,
          "is_deleted" INTEGER NOT NULL DEFAULT 0,
          "created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY("id")
        )`
      );
      db.run(`
        CREATE TABLE "Applications" (
          "id" INTEGER,
          "course_id" INTEGER NOT NULL,
          "participant_id" INTEGER NOT NULL,
          "is_deleted" INTEGER NOT NULL DEFAULT 0,
          "created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY("id")
        )`
      );
      db.run(`
        CREATE TABLE "Wishlist" (
          "id" INTEGER,
          "user_id" INTEGER NOT NULL,
          "course_id" INTEGER NOT NULL,
          "is_deleted" INTEGER NOT NULL DEFAULT 0,
          "created_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY("id")
        )`
      );
      db.run(`CREATE INDEX a ON "Courses" ("owner");`);
      db.run(`CREATE UNIQUE INDEX b ON "Users" ("email");`);
      db.run(`CREATE UNIQUE INDEX c ON "CourseImages" ("course_id", "idx");`);
      db.run(`CREATE UNIQUE INDEX d ON "Wishlist" ("user_id", "course_id");`);
      db.run(`CREATE UNIQUE INDEX e ON "Wishlist" ("course_id", "user_id");`);
      db.run(`CREATE UNIQUE INDEX f ON "Applications" ("course_id", "participant_id");`);
      db.run(`CREATE UNIQUE INDEX g ON "Applications" ("participant_id", "course_id");`);
      for (const user of initialUsers) {
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
            user.type,
            user.email,
            user.password,
            user.displayName
          ]
        );
      }

      let i = 1;
      for (const course of require('../../data/data.json')) {
        const thumbnailUrl = process.env.AWS_S3_BUCKET_PUBLIC_ACCESS_URL
          .concat(process.env.AWS_S3_BUCKET_COURSES_THUMBNAILS_PREFIX)
          .concat(course.image);
        db.run(
          `INSERT INTO "Courses" (
            owner,
            title, summary, details, category,
            date, price, contact, location, max_participants
          ) VALUES (
            ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?
          );`,
          [
            34 + i,
            course.title, course.description, course.content,
            course.category,
            Math.floor(Date.parse(course.date) / 1000) +  540 * 60,
            course.price,
            course.phone,
            course.location,
            course.participants
          ],
        );
        db.run(
          `INSERT INTO "Wishlist" (user_id, course_id) VALUES (1, ?);`,
          [ i ]
        );
        db.run(
          `INSERT INTO "Applications" (participant_id, course_id) VALUES (1, ?);`,
          [ i ]
        );
        db.run(
          `INSERT INTO "CourseImages" (course_id, idx, url) VALUES (?, 0, ?);`,
          [ i, thumbnailUrl ]
        );
        db.run(
          `INSERT INTO "CourseImages" (course_id, idx, url) VALUES (?, 1, ?);`,
          [ i, thumbnailUrl ]
        );

        for (let j=3; j<2 + numDemoStd; j++) {
          if (Math.random() < 0.5) {
            db.run(`INSERT INTO "Wishlist" (user_id, course_id) VALUES (${j}, ${i});`)
          }
        }

        i++;
      }
    });

    DBHandler._db = db;

    return db;
  }
}

export class AWSS3Handler {
  static _client: S3Client | null = null;

  get client(): S3Client {
    if (AWSS3Handler._client !== null) {
      return AWSS3Handler._client;
    }

    const client = new S3Client({
      region: 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    AWSS3Handler._client = client;

    return client;
  }
}

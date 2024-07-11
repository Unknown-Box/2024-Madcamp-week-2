import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { AWSS3Handler, DBHandler } from 'src/utils/utils';

@Injectable()
export class CoursesRepository {
  async getCourse(courseId: number): Promise<any> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          c.id,
          c.title,
          c.name,
          c.date,
          c.max_participants AS participants,
          c.category,
          c.contact AS phone,
          c.summary AS description,
          c.price,
          c.location,
          c.details AS content,
          c.numWishes,
          c.currentParticipants,
          GROUP_CONCAT(ci.url, '|') AS images,
          strftime('%s', c.created_at) AS createdAt
        FROM
        (
          SELECT
            c.*,
            COUNT(a.participant_id)-1 AS currentParticipants
          FROM
          (
            SELECT
              c.*,
              COUNT(w.user_id)-1 AS numWishes
            FROM
            (
              SELECT
                c.*,
                u.display_name AS name
              FROM "Courses" AS c
              JOIN "Users" AS u ON c.owner=u.id
              WHERE c.id=? AND c.is_deleted=0
            ) AS c
            JOIN "Wishlist" AS w ON c.id=w.course_id
          ) AS c
          JOIN "Applications" AS a ON c.id=a.course_id
        ) AS c
        JOIN "CourseImages" AS ci ON c.id=ci.course_id
        GROUP BY ci.course_id
        ORDER BY ci.idx ASC
        `,
        [ courseId ],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          console.log(row);

          resolve(!!row ? row : null);
        }
      );
    });
  }

  async getCourseWithToken(userId: number, courseId: number): Promise<any> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          c.id,
          c.title,
          c.name,
          c.date,
          c.max_participants AS participants,
          c.category,
          c.contact AS phone,
          c.summary AS description,
          c.price,
          c.location,
          c.images,
          c.details AS content,
          c.numWishes,
          c.isFavorite,
          c.currentParticipants,
          a.participant_id IS NOT NULL AS isParticipating,
          strftime('%s', c.created_at) AS createdAt
        FROM
        (
          SELECT
            c.*,
            w.user_id IS NOT NULL AS isFavorite
          FROM
          (
            SELECT
              c.*,
              GROUP_CONCAT(ci.url, '|') AS images
            FROM
            (
              SELECT
                c.*,
                COUNT(a.participant_id)-1 AS currentParticipants
              FROM
              (
                SELECT
                  c.*,
                  COUNT(w.user_id)-1 AS numWishes
                FROM
                (
                  SELECT
                    c.*,
                    u.display_name AS name
                  FROM "Courses" AS c
                  JOIN "Users" AS u ON c.owner=u.id
                  WHERE c.id=? AND c.is_deleted=0
                ) AS c
                JOIN "Wishlist" AS w ON c.id=w.course_id
              ) AS c
              JOIN "Applications" AS a ON c.id=a.course_id
            ) AS c
            JOIN "CourseImages" AS ci ON c.id=ci.course_id
            GROUP BY ci.course_id
            ORDER BY ci.idx ASC
          ) AS c
          LEFT JOIN "Wishlist" AS w ON c.id=w.course_id AND w.user_id=?
        ) AS c
        LEFT JOIN "Applications" AS a ON c.id=a.course_id AND a.participant_id=? AND a.is_deleted=0
        `,
        [ courseId, userId, userId ],
        (err, rows) => {
          console.log(courseId, userId)
          if (err) {
            console.log(err);
            reject(err);
            return;
          }

          console.log(rows);

          resolve(!!rows ? rows : null);
        }
      );
    });
  }

  async listCourses(): Promise<[any[], any[], any[]]> {
    const db = new DBHandler().db;


    return Promise.all([
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.details AS content,
            c.numWishes,
            strftime('%s', c.created_at) AS createdAt,
            c.currentParticipants,
            GROUP_CONCAT(ci.url, '|') AS images
          FROM
          (
            SELECT
              c.*,
              COUNT(a.participant_id) AS currentParticipants
            FROM
            (
              SELECT
                c.*,
                COUNT(w.user_id) AS numWishes
              FROM
              (
                SELECT
                  c.*,
                  u.display_name AS name
                FROM
                (
                  SELECT
                    *
                  FROM "Courses" AS c
                  WHERE c.is_deleted=0
                  ORDER BY created_at DESC
                  LIMIT 64
                ) AS c
                JOIN "Users" AS u ON c.owner=u.id
              ) AS c
              JOIN "Wishlist" AS w ON c.id=w.course_id
              GROUP BY w.course_id
            ) AS c
            JOIN "Applications" AS a ON c.id=a.course_id
            GROUP BY a.course_id
            ORDER BY c.created_at DESC
          ) AS c
          JOIN "CourseImages" AS ci ON c.id=ci.course_id
          GROUP BY ci.course_id
          ORDER BY createdAt DESC, ci.idx ASC
          `,
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.details AS content,
            c.numWishes,
            c.currentParticipants,
            strftime('%s', c.created_at) AS createdAt,
            GROUP_CONCAT(ci.url, '|') AS images
          FROM
          (
            SELECT
              c.*,
              COUNT(a.participant_id) AS currentParticipants
            FROM
            (
              SELECT
                c.*,
                u.display_name AS name
              FROM
              (
                SELECT
                  c.*,
                  COUNT(w.user_id) AS numWishes
                FROM "Wishlist" AS w
                JOIN "Courses" AS c ON w.course_id=c.id
                GROUP BY w.course_id
                ORDER BY numWishes DESC
                LIMIT 64
              ) AS c
              JOIN "Users" AS u ON c.owner=u.id
            ) AS c
            JOIN "Applications" AS a ON c.id=a.course_id
            GROUP BY a.course_id
          ) AS c
          JOIN "CourseImages" AS ci ON c.id=ci.course_id
          GROUP BY ci.course_id
          ORDER BY c.numWishes DESC, c.id ASC, ci.idx ASC
          `,
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.details AS content,
            c.numWishes,
            c.currentParticipants,
            strftime('%s', c.created_at) AS createdAt,
            GROUP_CONCAT(ci.url, '|') AS images
          FROM
          (
            SELECT
              c.*,
              COUNT(a.participant_id) AS currentParticipants
            FROM
            (
              SELECT
                c.*,
                COUNT(w.user_id) AS numWishes
              FROM
              (
                SELECT
                  c.*,
                  u.display_name AS name
                FROM
                (
                  SELECT
                    *
                  FROM "Courses" AS c
                  WHERE c.is_deleted=0
                  ORDER BY RANDOM()
                  LIMIT 64
                ) AS c
                JOIN "Users" AS u ON u.id=c.owner
              ) AS c
              JOIN "Wishlist" AS w ON w.course_id=c.id
              GROUP BY w.course_id
            ) AS c
            JOIN "Applications" AS a ON a.course_id=c.id
            GROUP BY a.course_id
          ) AS c
          JOIN "CourseImages" AS ci ON ci.course_id=c.id
          GROUP BY ci.course_id
          ORDER BY ci.idx ASC
          `,
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
    ]);
  }

  async listCoursesWithToken(userId: number): Promise<[any[], any[], any[]]> {
    const db = new DBHandler().db;


    return Promise.all([
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.images,
            c.details AS content,
            c.numWishes,
            strftime('%s', c.created_at) AS createdAt,
            c.currentParticipants,
            w.user_id IS NOT NULL AS isFavorite
          FROM
          (
            SELECT
              c.*,
              GROUP_CONCAT(ci.url, '|') AS images
            FROM
            (
              SELECT
                c.*,
                COUNT(a.participant_id) AS currentParticipants
              FROM
              (
                SELECT
                  c.*,
                  COUNT(w.user_id) AS numWishes
                FROM
                (
                  SELECT
                    c.*,
                    u.display_name AS name
                  FROM
                  (
                    SELECT
                      *
                    FROM "Courses" AS c
                    WHERE c.is_deleted=0
                    ORDER BY created_at DESC
                    LIMIT 64
                  ) AS c
                  JOIN "Users" AS u ON c.owner=u.id
                ) AS c
                JOIN "Wishlist" AS w ON c.id=w.course_id
                GROUP BY w.course_id
              ) AS c
              JOIN "Applications" AS a ON c.id=a.course_id
              GROUP BY a.course_id
              ORDER BY c.created_at DESC
            ) AS c
            JOIN "CourseImages" AS ci ON c.id=ci.course_id
            GROUP BY ci.course_id
            ORDER BY ci.idx ASC
          ) AS c
          LEFT JOIN "Wishlist" AS w ON w.course_id=c.id AND w.user_id=? AND w.is_deleted=0
          ORDER BY createdAt DESC
          `,
          [ userId ],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.images,
            c.details AS content,
            c.numWishes,
            c.currentParticipants,
            strftime('%s', c.created_at) AS createdAt,
            w.user_id IS NOT NULL AS isFavorite
          FROM
          (
            SELECT
              c.*,
              GROUP_CONCAT(ci.url, '|') AS images
            FROM
            (
              SELECT
                c.*,
                COUNT(a.participant_id) AS currentParticipants
              FROM
              (
                SELECT
                  c.*,
                  u.display_name AS name
                FROM
                (
                  SELECT
                    c.*,
                    COUNT(w.user_id) AS numWishes
                  FROM "Wishlist" AS w
                  JOIN "Courses" AS c ON w.course_id=c.id
                  GROUP BY w.course_id
                  ORDER BY numWishes DESC
                  LIMIT 64
                ) AS c
                JOIN "Users" AS u ON c.owner=u.id
              ) AS c
              JOIN "Applications" AS a ON c.id=a.course_id
              GROUP BY a.course_id
            ) AS c
            JOIN "CourseImages" AS ci ON c.id=ci.course_id
            GROUP BY ci.course_id
            ORDER BY c.numWishes DESC, c.id ASC, ci.idx ASC
          ) AS c
          LEFT JOIN "Wishlist" AS w ON w.course_id=c.id AND w.user_id=? AND w.is_deleted=0
          `,
          [ userId ],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.images,
            c.details AS content,
            c.numWishes,
            c.currentParticipants,
            strftime('%s', c.created_at) AS createdAt,
            w.user_id IS NOT NULL AS isFavorite
          FROM
          (
            SELECT
              c.*,
              GROUP_CONCAT(ci.url, '|') AS images
            FROM
            (
              SELECT
                c.*,
                COUNT(a.participant_id) AS currentParticipants
              FROM
              (
                SELECT
                  c.*,
                  COUNT(w.user_id) AS numWishes
                FROM
                (
                  SELECT
                    c.*,
                    u.display_name AS name
                  FROM
                  (
                    SELECT
                      *
                    FROM "Courses" AS c
                    WHERE c.is_deleted=0
                    ORDER BY RANDOM()
                    LIMIT 64
                  ) AS c
                  JOIN "Users" AS u ON u.id=c.owner
                ) AS c
                JOIN "Wishlist" AS w ON w.course_id=c.id
                GROUP BY w.course_id
              ) AS c
              JOIN "Applications" AS a ON a.course_id=c.id
              GROUP BY a.course_id
            ) AS c
            JOIN "CourseImages" AS ci ON ci.course_id=c.id
            GROUP BY ci.course_id
            ORDER BY ci.idx ASC
          ) AS c
          LEFT JOIN "Wishlist" AS w ON w.course_id=c.id AND w.user_id=? AND w.is_deleted=0
          ORDER BY RANDOM()
          `,
          [ userId ],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
    ]);
  }

  async createCourse(
    owner: number,
    title: string,
    summary: string,
    details: string,
    category: string,
    imgUrls: string[],
    date: number,
    price: number,
    contact: string,
    location: string,
    maxParticipants: number,
  ): Promise<number | null> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO "Courses"
          (
            date, owner, price, title, contact, details, summary,
            category, location, max_participants
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?
        );`,
        [
          date, owner, price, title, contact, details, summary,
          category, location, maxParticipants
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          const createdId = this.lastID;
          if (!createdId) {
            resolve(null);
            return;
          }

          db.serialize(() => {
            try {
              db.run(
                `INSERT INTO "Wishlist" (user_id, course_id) VALUES (1, ?);`,
                [ createdId ]
              );
              db.run(
                `INSERT INTO "Applications" (participant_id, course_id) VALUES (1, ?);`,
                [ createdId ]
              );
              for (let i = 0; i<imgUrls.length; i++) {
                const idx = i;
                const url = imgUrls[i];

                db.run(
                  `INSERT INTO "CourseImages" (course_id, idx, url) VALUES (?, ?, ?)`,
                  [ createdId, idx, url ]
                );
              }

              resolve(createdId);
            } catch(e) {
              console.error(e);
              reject(e);
            }
          });
        }
      )

    });
  }

  async uploadCourseImgs(imgs: Express.Multer.File[]): Promise<string[] | null> {
    try {
      return await Promise.all(imgs.map(async (img) => {
        const client = new AWSS3Handler().client;
        const fileExt = extname(img.originalname);

        const Key = join(
          process.env.AWS_S3_BUCKET_COURSES_THUMBNAILS_PREFIX,
          randomUUID().concat(fileExt)
        );
        const Body = img.buffer;
        const Bucket = process.env.AWS_S3_BUCKET_NAME;
        const result = await client.send(
          new PutObjectCommand({ Key, Body, Bucket })
        );

        return process.env.AWS_S3_BUCKET_PUBLIC_ACCESS_URL.concat(Key);
      }));
    } catch(e) {
      return null;
    }
  }

  async updateCourse(
    id: number,
    title: string,
    summary: string,
    details: string,
    category: string,
    imgUrls: string[],
    date: number,
    price: number,
    contact: string,
    location: string,
    maxParticipants: number,
  ): Promise<boolean | null> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE "Courses"
        SET date=?, price=?, title=?, contact=?, details=?,
            summary=?, category=?, location=?, max_participants=?
        WHERE id=?
        `,
        [
          date, price, title, contact, details, summary,
          category, location, maxParticipants, id
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          const isUpdated = !!this.changes;

          db.serialize(() => {
            try {
              for (let i = 0; i<imgUrls.length; i++) {
                const idx = i;
                const url = imgUrls[i];

                db.run(
                  `UPDATE "CourseImages" SET url=? WHERE course_id=? AND idx=?`,
                  [ url, id, idx ]
                );
              }

              resolve(isUpdated);
            } catch(e) {
              reject(e);
            }
          });
        }
      );
    });
  }

  async deleteCourse(userId: number, courseId: number): Promise<boolean> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE "Courses" SET is_deleted=1 WHERE id=? AND owner=? AND is_deleted=0`,
        [ courseId, userId ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve(!!this.changes);
        }
      )
    });
  }

  async createApplication(userId: number, courseId: number): Promise<boolean> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO "Applications" (course_id, participant_id, is_deleted) VALUES (?, ?, 0);`,
        [ courseId, userId ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          console.log(courseId, userId, this.lastID)

          resolve(!!this.lastID);
        }
      );
    });
  }

  async deleteApplication(userId: number, courseId: number): Promise<boolean> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE "Applications" SET is_deleted=1
        WHERE course_id=? AND participant_id=? AND is_deleted=0`,
        [ courseId, userId ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve(!!this.changes);
        }
      )
    });
  }

  async createWish(userId: number, courseId: number): Promise<boolean> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO "Wishlist" (user_id, course_id, is_deleted) VALUES (?, ?, 0);`,
        [ userId, courseId ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve(!!this.lastID);
        }
      );
    });
  }

  async deleteWish(userId: number, courseId: number): Promise<boolean> {
    const db = new DBHandler().db;

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE "Wishlist" SET is_deleted=1
        WHERE user_id=? AND course_id=? AND is_deleted=0`,
        [ userId, courseId ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve(!!this.changes);
        }
      )
    });
  }

  async getCoursesByOwner(owner: number) {
    const db = new DBHandler().db;
    console.log(owner)

    return new Promise((resolve, reject) => {
      db.all(
        `
        SELECT
          c3.id,
          c3.title,
          c3.name,
          c3.date,
          c3.max_participants AS participants,
          c3.contact AS phone,
          c3.summary AS description,
          c3.price,
          c3.details AS content,
          c3.numWishes,
          c3.currentParticipants,
          strftime('%s', c3.created_at) AS createdAt,
          GROUP_CONCAT(ci.url, '|') AS images
        FROM
        (
          SELECT
            c2.*,
            COUNT(a.participant_id)-1 AS currentParticipants
          FROM
          (
            SELECT
              c1.*,
              COUNT(w.user_id)-1 AS numWishes
            FROM
            (
              SELECT
                c.*,
                u.display_name AS name
              FROM
              (
                SELECT
                  *
                FROM "Users"
                WHERE id=?
              ) AS u
              JOIN "Courses" AS c ON u.id=c.owner AND c.is_deleted=0
            ) AS c1
            JOIN "Wishlist" AS w ON c1.id=w.course_id
            GROUP BY w.course_id
          ) AS c2
          JOIN "Applications" AS a ON c2.id=a.course_id
          GROUP BY a.course_id
        ) AS c3
        JOIN "CourseImages" AS ci ON c3.id=ci.course_id
        GROUP BY ci.course_id
        `,
        [ owner ],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows);
        }
      );
    });
  }

  async getCoursesByStudent(userId: number) {
    const db = new DBHandler().db;

    return Promise.all([
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.images,
            c.details AS content,
            c.numWishes,
            c.currentParticipants,
            true AS isParticipating,
            strftime('%s', c.created_at) AS createdAt
          FROM
          (
            SELECT
              c.*,
              GROUP_CONCAT(ci.url, '|') AS images
            FROM
            (
              SELECT
                c.*,
                COUNT(a.participant_id) AS currentParticipants
              FROM
              (
                SELECT
                  c.*,
                  COUNT(w.user_id) AS numWishes
                FROM
                (
                  SELECT
                    c.*,
                    u.display_name AS name
                  FROM
                  (
                    SELECT
                      c.*,
                      appCreatedAt
                    FROM
                    (
                      SELECT
                        u.*,
                        a.course_id,
                        a.created_at as appCreatedAt
                      FROM
                      (
                        SELECT
                          *
                        FROM "Users"
                        WHERE id=?
                      ) AS u
                      JOIN "Applications" AS a ON u.id=a.participant_id AND a.is_deleted=0
                    ) AS u
                    JOIN "Courses" AS c ON u.course_id=c.id AND c.is_deleted=0
                  ) AS c
                  JOIN "Users" AS u ON c.owner=u.id
                ) AS c
                JOIN "Wishlist" AS w ON c.id=w.course_id AND w.is_deleted=0
                GROUP BY w.course_id
              ) AS c
              JOIN "Applications" AS a ON c.id=a.course_id AND a.is_deleted=0
              GROUP BY a.course_id
            ) AS c
            JOIN "CourseImages" AS ci ON c.id=ci.course_id
            GROUP BY ci.course_id
            ORDER BY ci.idx ASC
          ) AS c
          ORDER BY appCreatedAt DESC
          `,
          [ userId ],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      }),
      new Promise<any[]>((resolve, reject) => {
        db.all(
          `
          SELECT
            c.id,
            c.title,
            c.name,
            c.date,
            c.max_participants AS participants,
            c.category,
            c.contact AS phone,
            c.summary AS description,
            c.price,
            c.location,
            c.images,
            c.details AS content,
            c.numWishes,
            c.currentParticipants,
            true AS isFavorite,
            strftime('%s', c.created_at) AS createdAt
          FROM
          (
            SELECT
              c.*,
              GROUP_CONCAT(ci.url, '|') AS images
            FROM
            (
              SELECT
                c.*,
                COUNT(a.participant_id) AS currentParticipants
              FROM
              (
                SELECT
                  c.*,
                  COUNT(w.user_id) AS numWishes
                FROM
                (
                  SELECT
                    c.*,
                    u.display_name AS name
                  FROM
                  (
                    SELECT
                      c.*,
                      wishCreatedAt
                    FROM
                    (
                      SELECT
                        u.*,
                        w.course_id,
                        w.created_at as wishCreatedAt
                      FROM
                      (
                        SELECT
                          *
                        FROM "Users"
                        WHERE id=?
                      ) AS u
                      JOIN "Wishlist" AS w ON u.id=w.user_id AND w.is_deleted=0
                    ) AS u
                    JOIN "Courses" AS c ON u.course_id=c.id AND c.is_deleted=0
                  ) AS c
                  JOIN "Users" AS u ON c.owner=u.id
                ) AS c
                JOIN "Wishlist" AS w ON c.id=w.course_id AND w.is_deleted=0
                GROUP BY w.course_id
              ) AS c
              JOIN "Applications" AS a ON c.id=a.course_id AND a.is_deleted=0
              GROUP BY a.course_id
            ) AS c
            JOIN "CourseImages" AS ci ON c.id=ci.course_id
            GROUP BY ci.course_id
            ORDER BY ci.idx ASC
          ) AS c
          ORDER BY wishCreatedAt DESC
          `,
          [ userId ],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(rows);
          }
        );
      })
    ]);
  }
}

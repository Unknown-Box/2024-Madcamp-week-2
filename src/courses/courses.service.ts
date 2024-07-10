import { Injectable } from '@nestjs/common';
import { CoursesRepository } from './courses.repository';

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async getCourse(courseId: number): Promise<any> {
    const course = await this.coursesRepository.getCourse(courseId);

    return course === null ? null : this.exportCourse(course);
  }

  async getCourseWithToken(userId: number, courseId: number): Promise<any> {
    const course = await this.coursesRepository.getCourseWithToken(userId, courseId);

    return course === null ? null : this.exportCourse(course);
  }

  async listCourses(): Promise<[any[], any[], any[]]> {
    const tmp = await this.coursesRepository.listCourses();

    return tmp.map(l => l.map(this.exportCourse)) as [any[], any[], any[]];
  }

  async listCoursesWithToken(userId: number): Promise<[any[], any[], any[]]> {
    const tmp = await this.coursesRepository.listCoursesWithToken(userId);

    return tmp.map(l => l.map(this.exportCourse)) as [any[], any[], any[]];
  }

  async listStudentMy(): Promise<[any[], any[]]> {
    return [[], []];
  }

  async createCourse(
    owner: number,
    title: string,
    summary: string,
    details: string,
    category: string,
    imgs: Express.Multer.File[],
    date: number,
    price: number,
    contact: string,
    location: string,
    maxParticipants: number,
  ): Promise<number | null> {
    try {
      const imgUrls = await this.coursesRepository.uploadCourseImgs(imgs);
      if (imgUrls === null) {
        return null;
      }

      const createdId = await this.coursesRepository.createCourse(
        owner,
        title, summary, details, category, imgUrls,
        date, price, contact, location, maxParticipants
      );

      return createdId;
    } catch (e) {
      return null;
    }
  }

  async updateCourse(
    id: number,
    title: string,
    summary: string,
    details: string,
    category: string,
    imgs: Express.Multer.File[],
    date: number,
    price: number,
    contact: string,
    location: string,
    maxParticipants: number,
  ): Promise<boolean | null> {
    try {
      const imgUrls = await this.coursesRepository.uploadCourseImgs(imgs);
      if (imgUrls === null) {
        return null;
      }
      console.log(imgUrls)

      const isUpdated = await this.coursesRepository.updateCourse(
        id,
        title, summary, details, category, imgUrls,
        date, price, contact, location, maxParticipants
      );

      return isUpdated;
    } catch (e) {
      return null;
    }
  }

  async deleteCourse(userId: number, courseId: number) {
    return this.coursesRepository.deleteCourse(userId, courseId);
  }

  async createApplication(userId: number, courseId: number): Promise<boolean> {
    return this.coursesRepository.createApplication(userId, courseId);
  }

  async deleteApplication(userId: number, courseId: number) {
    return this.coursesRepository.deleteApplication(userId, courseId);
  }

  async createWish(userId: number, courseId: number): Promise<boolean> {
    return this.coursesRepository.createWish(userId, courseId);
  }

  async deleteWish(userId: number, courseId: number) {
    return this.coursesRepository.deleteWish(userId, courseId);
  }

  private exportCourse(course: any) {
    return {
      ...course,
      date: new Date(course.date * 1000).toLocaleString(
        'ko-KR',
        { dateStyle: 'full' }
      ),
      price: course.price.toLocaleString(
        'ko-KR',
        { style: 'currency', currency: 'KRW' }
      ),
      images: course.images?.split('|'),
      createdAt: new Date(course.createdAt * 1000 + 540 * 60 * 1000).toISOString().slice(0, -1),
      isFavorite: !!course.isFavorite,
      isParticipating: !!course.isParticipating
    }
  }

  async getMyPageExpert(userId: number) {
    const tmp = await this.coursesRepository.getCoursesByOwner(userId) as any[];

    return tmp.map(this.exportCourse);
  }

  async getMyPageStudent(userId: number) {
    const tmp = await this.coursesRepository.getCoursesByStudent(userId);

    return tmp.map(l => l.map(this.exportCourse)) as [any[], any[]];
  }
}

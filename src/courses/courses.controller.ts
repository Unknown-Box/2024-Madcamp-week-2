import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Headers, InternalServerErrorException, NotFoundException, Param, ParseFilePipeBuilder, Post, Put, Query, Search, UnauthorizedException, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { AnyFilesInterceptor, FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { authorize, validateDatetime as validateDatestring, validateId, validateInt } from 'src/utils/utils';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly coursesService: CoursesService
  ) {}

  @Get('mypage')
  async getMyInfo(
    // @Query('sort_by_field') field?: string,
    // @Query('sort_by_direction') dir?: string,
    @Headers('Authorization') token?: string
  ): Promise<any> {
    // let _field;
    // switch (field) {
    //   case 'created_at':
    //     _field = 'createdAt'
    //     break;
    //   case 'popularity':
    //     _field = 'numWishes';
    //     break;
    //   default:
    //     throw new BadRequestException();
    // }


    // let _dir;
    // switch (dir) {
    //   case 'asc':
    //     _dir = 'ASC'
    //     break;
    //   case 'desc':
    //     _dir = 'DESC';
    //     break;
    //   default:
    //     throw new BadRequestException();
    // }

    const { userId, type } = authorize(this.jwtService, token);
    if (type === 'expert') {
      const courses = await this.coursesService.getMyPageExpert(userId);
      // const courses = await this.coursesService.getMyPageExpert(userId, _field, _dir);
      return { courses };
    } else {
      const [ history, wishlist ] = await this.coursesService.getMyPageStudent(userId);
      // const [ history, wishlist ] = await this.coursesService.getMyPageStudent(userId, _field, _dir);
      return { history, wishlist };
    }
  }

  @Get()
  async listCourses(@Headers('Authorization') token?: string) {
    let userId;
    try {
      ({ userId } = authorize(this.jwtService, token));
    } catch(e) {
      const [
        trending,
        choice,
        recommended
      ] = await this.coursesService.listCourses();

      return { trending, choice, recommended };
    }

    const [
      trending,
      choice,
      recommended
    ] = await this.coursesService.listCoursesWithToken(userId);

    return { trending, choice, recommended };
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: "thumbnail",
          maxCount: 1,
        },
        {
          name: "additionalImages",
          maxCount: 8
        }
      ],
      {
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_, file, cb) => { cb(null, file.mimetype.startsWith('image/')) },
      }
    )
  )
  async createCourse(
    @UploadedFiles() files: {
      thumbnail?: Express.Multer.File[],
      additionalImages?: Express.Multer.File[]
    },
    @Body('title') title?: string,
    @Body('phone') contact?: string,
    @Body('category') category?: string,
    @Body('description') summary?: string,
    @Body('date') date?: string,
    @Body('location') location?: string,
    @Body('price') price?: string,
    @Body('participants') maxParticipants?: string,
    @Body('content') details?: string,
    @Headers('Authorization') token?: string
  ) {
    const { thumbnail, additionalImages } = files;
    const imgs = [...thumbnail, ...(additionalImages ?? [])];
    if (!title
        || !contact
        || !category
        || !summary
        || !date
        || !location
        || !price
        || !maxParticipants
        || !details
        || imgs.length === 0) {
      throw new BadRequestException();
    }

    const [ _date, isDateValid ] = validateDatestring(date);
    const [ _price, isPriceValid ] = validateInt(price);
    const [ _maxParticipants, isMaxParticipantsValid ] = validateInt(maxParticipants);
    if (!isDateValid
        || !isPriceValid
        || !isMaxParticipantsValid
    ) {
      throw new BadRequestException();
    }

    const { userId } = authorize(this.jwtService, token);
    const createdId = await this.coursesService.createCourse(
      userId,
      title,
      summary,
      details,
      category,
      imgs,
      _date,
      _price,
      contact,
      location,
      _maxParticipants
    );
    if (createdId === null) {
      throw new InternalServerErrorException();
    }

    return { courseId: createdId };
  }

  @Get(':courseId')
  async getCourse(
    @Param('courseId') courseId: string,
    @Headers('Authorization') token?: string
  ) {
    const [ _courseId, isValid ] = validateId(courseId);
    if (!isValid) {
      throw new BadRequestException();
    }

    let userId;
    try {
      ({ userId } = authorize(this.jwtService, token));
    } catch(e) {
      const course = await this.coursesService.getCourse(_courseId);
      if (course === null) {
        throw new NotFoundException();
      }

      return course;
    }

    const course = await this.coursesService.getCourseWithToken(userId, _courseId);
    if (course === null) {
      throw new NotFoundException();
    }

    return course;
  }

  @Put(':courseId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: "thumbnail",
          maxCount: 1,
        },
        {
          name: "additionalImages",
          maxCount: 8
        }
      ],
      {
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_, file, cb) => { cb(null, file.mimetype.startsWith('image/')) },
      }
    )
  )
  async updateCourse(
    @UploadedFiles() files: {
      thumbnail?: Express.Multer.File[],
      additionalImages?: Express.Multer.File[]
    },
    @Body('title') title?: string,
    @Body('phone') contact?: string,
    @Body('category') category?: string,
    @Body('description') summary?: string,
    @Body('date') date?: string,
    @Body('location') location?: string,
    @Body('price') price?: string,
    @Body('participants') maxParticipants?: string,
    @Body('content') details?: string,
    @Param('courseId') courseId?: string,
    @Headers('Authorization') token?: string
  ) {
    const { thumbnail, additionalImages } = files;
    const imgs = [...thumbnail, ...(additionalImages ?? [])];
    if (!title
        || !contact
        || !category
        || !summary
        || !date
        || !location
        || !price
        || !maxParticipants
        || !details
        || imgs.length === 0) {
      throw new BadRequestException();
    }

    const [ _courseId, _ ] = validateId(courseId);
    const [ _date, isDateValid ] = validateDatestring(date);
    const [ _price, isPriceValid ] = validateInt(price);
    const [ _maxParticipants, isMaxParticipantsValid ] = validateInt(maxParticipants);
    if (!isDateValid
        || !isPriceValid
        || !isMaxParticipantsValid
    ) {
      throw new BadRequestException();
    }

    const { userId } = authorize(this.jwtService, token);
    const createdId = await this.coursesService.updateCourse(
      _courseId,
      title,
      summary,
      details,
      category,
      imgs,
      _date,
      _price,
      contact,
      location,
      _maxParticipants
    );
    if (createdId === null) {
      throw new InternalServerErrorException();
    }

    return { courseId: createdId };
  }

  @Delete(':courseId')
  async deleteCourse(
    @Param('courseId') courseId: string,
    @Headers('Authorization') token?: string
  ) {
    const [ _courseId, isValid ] = validateId(courseId);
    if (!isValid) {
      throw new BadRequestException();
    }

    const { userId } = authorize(this.jwtService, token);
    const isDeleted = await this.coursesService.deleteCourse(userId, _courseId);

    if (!isDeleted) {
      throw new InternalServerErrorException();
    }

    return {};
  }

  @Post(':courseId/wish')
  async createCourseWish(
    @Param('courseId') courseId: string,
    @Headers('Authorization') token?: string
  ) {
    const [ _courseId, isValid ] = validateId(courseId);
    if (!isValid) {
      throw new BadRequestException();
    }

    const { userId } = authorize(this.jwtService, token);

    try {
      await this.coursesService.createWish(userId, _courseId);
    } catch(e) {
      if (e.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictException();
      } else {
        throw new InternalServerErrorException();
      }
    }

    return {};
  }

  @Delete(':courseId/wish')
  async deleteCourseWish(
    @Param('courseId') courseId: string,
    @Headers('Authorization') token?: string
  ) {
    const [ _courseId, isValid ] = validateId(courseId);
    if (!isValid) {
      throw new BadRequestException();
    }

    const { userId } = authorize(this.jwtService, token);
    const isDeleted = await this.coursesService.deleteWish(userId, _courseId);
    if (!isDeleted) {
      throw new ConflictException();
    }

    return {};
  }

  @Post(':courseId/applications')
  async createCourseApplication(
    @Param('courseId') courseId: string,
    @Headers('Authorization') token?: string
  ) {
    const [ _courseId, isValid ] = validateId(courseId);
    if (!isValid) {
      throw new BadRequestException();
    }

    const { userId, type } = authorize(this.jwtService, token);

    if (type !== 'student') {
      throw new BadRequestException();
    }

    try {
      await this.coursesService.createApplication(userId, _courseId);
    } catch(e) {
      if (e.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictException();
      } else {
        throw new InternalServerErrorException();
      }
    }

    return {};
  }

  @Delete(':courseId/applications')
  async deleteCourseApplication(
    @Param('courseId') courseId: string,
    @Headers('Authorization') token?: string
  ) {
    const [ _courseId, isValid ] = validateId(courseId);
    if (!isValid) {
      throw new BadRequestException();
    }

    const { userId } = authorize(this.jwtService, token);
    const isDeleted = await this.coursesService.deleteApplication(userId, _courseId);
    if (!isDeleted) {
      throw new ConflictException();
    }

    return {};
  }
}

import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AppService } from './app.service';
import { authorize } from './utils/utils';
import { JwtService } from '@nestjs/jwt';
import { CoursesService } from './courses/courses.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { CoursesRepository } from './courses.repository';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: parseInt(process.env.JWT_MAX_AGE) },
      }),
    })
  ],
  providers: [CoursesService, CoursesRepository],
  controllers: [CoursesController],
  exports: [CoursesService]
})
export class CoursesModule {}

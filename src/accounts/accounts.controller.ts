import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Post, Query, Res } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Response } from 'express';
import { HTMLRedirection } from 'src/utils/utils';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountService: AccountsService) {}

  @Post('signin')
  async signIn(
    @Body('email') email?: string,
    @Body('password') password?: string
  ) {
    if (!email || !password) {
      return new BadRequestException();
    }

    const token = await this.accountService.createJWTByEmailPassword(email, password);
    console.log(token);

    if (token === null) {
      return new NotFoundException();
    }

    return { token };
  }

  @Post('signup')
  async signUp(
    @Body('type') type?: string,
    @Body('email') email?: string,
    @Body('password') password?: string,
    @Body('displayName') displayName?: string
  ) {
    if (!['expert', 'student'].includes(type)
        || !email
        || !password
        || !displayName) {
      return new BadRequestException();
    }

    const isAlreadyExist = await this.accountService.existByEmail(email);
    if (isAlreadyExist) {
      return new ConflictException();
    }
  }

  @Get('kakao/signin')
  async kakaoSignIn(@Query('code') code?: string) {
    if (code === null) {
      return new BadRequestException();
    }

    const email = await this.accountService.getEmailByKakaoOAuth(code);
    if (email === null) {
      console.log('social email doesn exists');
      return new NotFoundException();
    }

    const token = await this.accountService.createJWTByEmail(email);
    if (token === null) {
      return new NotFoundException();
    }

    return { token };
  }

  @Get('google/signin')
  async googleSignIn(@Query('code') code?: string) {
    if (code === null) {
      return new BadRequestException();
    }

    const email = await this.accountService.getEmailByGoogleOAuth(code);
    if (email === null) {
      console.log('social email doesn exists');
      return new NotFoundException();
    }

    const token = await this.accountService.createJWTByEmail(email);
    if (token === null) {
      return new NotFoundException();
    }

    return { token };
  }
}

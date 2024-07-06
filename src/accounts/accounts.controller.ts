import { BadRequestException, Body, ConflictException, Controller, Get, Header, InternalServerErrorException, NotFoundException, Post, Query, Res } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import e, { Response } from 'express';
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

    if (token === null) {
      throw new NotFoundException();
    }

    return { token };
  }

  @Post('signup')
  async signUp(
    @Body('type') type?: 'expert' | 'student',
    @Body('email') email?: string,
    @Body('password') password?: string,
    @Body('displayName') displayName?: string
  ) {
    if (!['expert', 'student'].includes(type)
        || !email
        || !password
        || !displayName) {
      throw new BadRequestException();
    }

    const isCreated = await this.accountService.createUser(type, email, password, displayName);
    switch(isCreated) {
      case 'failure':
        throw new InternalServerErrorException();

      case 'conflict':
        throw new ConflictException();
    }

    return;
  }

  @Get('kakao/signin')
  async kakaoSignIn(@Query('code') code?: string) {
    if (code === null) {
      throw new BadRequestException();
    }

    const email = await this.accountService.getEmailByKakaoOAuth(code);
    if (email === null) {
      console.log('social email doesn exists');
      throw new NotFoundException();
    }

    const token = await this.accountService.createJWTByEmail(email);
    if (token === null) {
      throw new NotFoundException({ email });
    }

    return { token };
  }

  @Get('google/signin')
  async googleSignIn(@Query('code') code?: string) {
    if (code === null) {
      throw new BadRequestException();
    }

    const email = await this.accountService.getEmailByGoogleOAuth(code);
    if (email === null) {
      console.log('social email doesn exists');
      throw new NotFoundException();
    }

    const token = await this.accountService.createJWTByEmail(email);
    if (token === null) {
      throw new NotFoundException({ email });
    }

    return { token };
  }
}

import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { HttpModule } from '@nestjs/axios';
import { AccountsRepository } from './accounts.repository';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: 600 },
      }),
    }),
  ],
  providers: [AccountsService, AccountsRepository],
  controllers: [AccountsController]
})
export class AccountsModule {}

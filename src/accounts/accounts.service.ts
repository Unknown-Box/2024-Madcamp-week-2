import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';
import { randomUUID } from 'crypto';
import { SHA256B64 } from 'src/utils/utils';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AccountsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly accountRepository: AccountsRepository
  ) {}

  private parseJWT(jwt: string) {
    const [ encodedHeader, encodedPayload ] = jwt.split('.');
    const headerText = Buffer.from(encodedHeader, 'base64').toString();
    const payloadText = Buffer.from(encodedPayload, 'base64').toString();
    const header = JSON.parse(headerText);
    const payload = JSON.parse(payloadText);

    return { header, payload };
  }

  async getEmailByKakaoOAuth(code: string): Promise<string | null> { // using OpenID
    const url = 'https://kauth.kakao.com/oauth/token';
    const res = await this.httpService.axiosRef.get(
      url,
      {
        params: {
          code,
          'client_id': process.env.KAKAOAPIS_CLIENT_ID,
          'grant_type': 'authorization_code',
          'redirect_uri': process.env.KAKAOAPIS_OAUTH_REDIRECT_URI
        }
      }
    );
    const { payload } = this.parseJWT(res.data['id_token']);
    return payload['email'] ?? null;
  }

  async getEmailByGoogleOAuth(code: string): Promise<string | null> { // using OpenID
    const url = 'https://oauth2.googleapis.com/token';
    const res = await this.httpService.axiosRef.post(
      url,
      {
        code,
        'client_id': process.env.GOOGLEAPIS_CLIENT_ID,
        'client_secret': process.env.GOOGLEAPIS_CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'redirect_uri': process.env.GOOGLEAPIS_OAUTH_REDIRECT_URI
      }
    );
    const { payload } = this.parseJWT(res.data['id_token']);

    return payload['email'] ?? null;
  }

  async createJWTByEmail(email: string): Promise<string | null> {
    const user = await this.accountRepository.getUserByEmail(email);

    if (user === null) {
      return null;
    }

    const userId = user['id'] as string;
    const type = user['type'] as string;
    const displayName = user['display_name'] as string;

    const payload = { userId, type, displayName };

    return await this.jwtService.signAsync(payload);
  }

  async createJWTByEmailPassword(email: string, password: string): Promise<string | null> {
    const user = await this.accountRepository.getUserByEmailPassword(email, password);

    if (user === null) {
      return null;
    }

    const userId = user['id'] as string;
    const type = user['type'] as string;
    const displayName = user['display_name'] as string;

    const payload = { userId, type, displayName };

    return await this.jwtService.signAsync(payload);
  }

  async existByEmail(email: string): Promise<boolean> {
    const user = await this.accountRepository.getUserByEmail(email);

    return user !== null;
  }

  async createUser(
    type: 'expert' | 'student',
    email: string,
    password: string,
    displayName: string
  ): Promise<'success' | 'failure' | 'conflict'> {
    try {
      const isCreated = await this.accountRepository.createUser(
        type,
        email,
        password,
        displayName
      );

      return isCreated ? 'success' : 'failure';
    } catch(e) {
      return 'conflict';
    }
  }
}

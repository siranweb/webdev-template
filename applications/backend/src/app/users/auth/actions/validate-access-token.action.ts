import { IAction } from '@/infra/common/types';
import { IJWTService } from 'src/app/users/auth/jwt';
import { Config } from '@/config';

export class ValidateAccessTokenAction implements IAction {
  constructor(
    private readonly jwtService: IJWTService,
    private readonly config: Config,
  ) {}
  async execute(accessToken: string): Promise<boolean> {
    try {
      await this.jwtService.verify({
        token: accessToken,
        secret: this.config.jwt.secret,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

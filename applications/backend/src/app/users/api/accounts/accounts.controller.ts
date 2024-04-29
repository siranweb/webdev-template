import { ApiError, ApiErrorType, Context } from '@/lib/web-server';
import { createAccountSchema, loginAccountSchema } from './accounts.schema';
import { IConfig, NodeEnv } from 'src/app/config';
import { buildCookie, parseCookie } from '@/app/common/utils/cookie';
import { TokenInvalidError } from '@/app/users/errors/token-invalid.error';
import {
  ICreateAccountCase,
  ICreateTokensByRefreshTokenCase,
  IInvalidateRefreshTokenCase,
  ILoginCase,
} from '@/app/users/domain/types';
import { createControllerDefinition } from '@/app/common/definitions/controller/creator';
import { IController } from '@/app/common/interfaces/controller.interface';
import { IControllerDefinition } from '@/app/common/interfaces/controller-definition.interface';
import { webServerAuth } from '@/di/entrypoints.di';

const { Handler, Chain, Controller, definition } = createControllerDefinition();

@Controller('accounts')
export class AccountsController implements IController {
  public readonly definition: IControllerDefinition = definition;

  constructor(
    private readonly config: IConfig,
    private readonly createAccountCase: ICreateAccountCase,
    private readonly createTokensByRefreshTokenCase: ICreateTokensByRefreshTokenCase,
    private readonly loginCase: ILoginCase,
    private readonly invalidateRefreshToken: IInvalidateRefreshTokenCase,
  ) {}

  @Handler('POST')
  async createAccount(ctx: Context) {
    const { body } = createAccountSchema.parse(ctx);
    const result = await this.createAccountCase.execute({
      login: body.login,
      password: body.password,
    });

    ctx.res.setHeader('Set-Cookie', [
      this.getAccessTokenCookie(result.accessToken),
      this.getRefreshTokenCookie(result.refreshToken),
    ]);
    ctx.res.end();
  }

  @Handler('POST', 'tokens')
  @Chain(webServerAuth)
  async refreshTokens(ctx: Context) {
    const cookieObj = parseCookie(ctx.req.headers.cookie ?? '');
    let result;
    try {
      result = await this.createTokensByRefreshTokenCase.execute(cookieObj.refreshToken);
    } catch (e) {
      if (e instanceof TokenInvalidError) {
        throw new ApiError({
          statusCode: 403,
          type: ApiErrorType.APP,
          original: e,
        });
      } else {
        throw e;
      }
    }

    await this.invalidateRefreshToken.execute(cookieObj.refreshToken);

    ctx.res.setHeader('Set-Cookie', [
      this.getAccessTokenCookie(result.accessToken),
      this.getRefreshTokenCookie(result.refreshToken),
    ]);
    ctx.res.end();
  }

  @Handler('POST', 'session')
  async login(ctx: Context) {
    const { body } = loginAccountSchema.parse(ctx);
    const result = await this.loginCase.execute(body.login, body.password);

    ctx.res.setHeader('Set-Cookie', [
      this.getAccessTokenCookie(result.accessToken),
      this.getRefreshTokenCookie(result.refreshToken),
    ]);
    ctx.res.end();
  }

  @Handler('DELETE', 'session')
  async logout(ctx: Context) {
    const cookieObj = parseCookie(ctx.req.headers.cookie ?? '');
    if (typeof cookieObj.refreshToken === 'string' && cookieObj.refreshToken) {
      await this.invalidateRefreshToken.execute(cookieObj.refreshToken);
    }

    ctx.res.setHeader('Set-Cookie', [
      this.getAccessTokenCookie(''),
      this.getRefreshTokenCookie(''),
    ]);
    ctx.res.end();
  }

  private getAccessTokenCookie(accessToken: string): string {
    const newCookieObj = {
      accessToken,
      HttpOnly: true,
      SameSite: 'strict',
      Secure: this.config.nodeEnv === NodeEnv.PRODUCTION,
    };

    return buildCookie(newCookieObj);
  }

  private getRefreshTokenCookie(refreshToken: string): string {
    const newCookieObj = {
      refreshToken,
      HttpOnly: true,
      SameSite: 'strict',
      Secure: this.config.nodeEnv === NodeEnv.PRODUCTION,
    };

    return buildCookie(newCookieObj);
  }
}

import { config } from '@/modules/config';
import { appDatabase } from '@/modules/databases/app-database/database';
import { JwtService } from '@/modules/jwt/domain/services/jwt.service';
import { CryptographyService } from '@/modules/cryptography/domain/services/cryptography.service';
import { UsersController } from '@/modules/api/users/users.controller';
import { UsersRepository } from '@/modules/users/repositories/users.repository';
import { CreateAccountCase } from '@/modules/users/domain/cases/create-account.case';
import { CreateTokensByRefreshTokenCase } from '@/modules/users/domain/cases/create-tokens-by-refresh-token.case';
import { LoginCase } from '@/modules/users/domain/cases/login.case';
import { InvalidateRefreshTokenCase } from '@/modules/users/domain/cases/invalidate-refresh-token.case';

const jwtService = new JwtService();
const cryptographyService = new CryptographyService();
const usersRepository = new UsersRepository(appDatabase);
const createAccountCase = new CreateAccountCase(
  usersRepository,
  jwtService,
  cryptographyService,
  config,
);
const createTokensCase = new CreateTokensByRefreshTokenCase(usersRepository, jwtService, config);
const loginCase = new LoginCase(usersRepository, cryptographyService, jwtService, config);
const invalidateRefreshTokenCase = new InvalidateRefreshTokenCase(usersRepository);

export const usersController = new UsersController(
  config,
  createAccountCase,
  createTokensCase,
  loginCase,
  invalidateRefreshTokenCase,
);

import { AppDatabase } from '@/init/databases/app-database/database';
import { Account } from '../auth/entities/account.entity';
import { IUsersRepository } from './types';

export class UsersRepository implements IUsersRepository {
  constructor(private readonly db: AppDatabase) {}

  async saveAccount(account: Account): Promise<Account> {
    return await this.db.transaction().execute(async (trx): Promise<Account> => {
      const result = await trx
        .insertInto('account')
        .values(account)
        .returningAll()
        .executeTakeFirstOrThrow();

      return new Account(result);
    });
  }

  async getAccountByLogin(login: string): Promise<Account | null> {
    const result = await this.db
      .selectFrom('account')
      .where('login', '=', login)
      .selectAll()
      .executeTakeFirst();

    return result ? new Account(result) : null;
  }

  async getAccountById(id: string): Promise<Account | null> {
    const result = await this.db
      .selectFrom('account')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    return result ? new Account(result) : null;
  }

  async storeInvalidRefreshToken(token: string): Promise<string> {
    const result = await this.db
      .insertInto('invalidRefreshToken')
      .values({ token })
      .returning('token')
      .executeTakeFirst();
    return result.token;
  }

  async isRefreshTokenUsed(token: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('invalidRefreshToken')
      .where('token', '=', token)
      .select('token')
      .executeTakeFirst();
    return !!result;
  }
}

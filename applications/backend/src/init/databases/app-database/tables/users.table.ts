import { TableBase } from './base';

export interface UsersTable extends TableBase {
  login: string;
  passwordHash: string;
  firstName: string;
  lastName: string | null;
}

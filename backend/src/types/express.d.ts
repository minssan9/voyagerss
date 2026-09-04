declare namespace Express {
  interface User {
    accountId: number;
    email: string;
    roles: string[];
  }
  interface Request {
    admin?: any;
  }
}

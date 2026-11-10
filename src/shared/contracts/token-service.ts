export interface AuthClaims {
  sub: string;
  roles: string[];
}

export interface TokenService {
  sign(claims: AuthClaims): Promise<string>;
  verify(token: string): Promise<AuthClaims>;
}

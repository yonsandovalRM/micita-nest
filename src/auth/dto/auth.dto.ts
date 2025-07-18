import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginEmailDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  tenantSlug: string;
}

export class LoginGoogleDto {
  @IsNotEmpty()
  @IsString()
  googleToken: string;

  @IsNotEmpty()
  @IsString()
  tenantSlug: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

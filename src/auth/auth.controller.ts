import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import {
  LoginEmailDto,
  LoginGoogleDto,
  RefreshTokenDto,
  RegisterEmailDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/email')
  @HttpCode(HttpStatus.CREATED)
  async registerWithEmail(@Body() registerDto: RegisterEmailDto) {
    return this.authService.registerWithEmail(
      registerDto.email,
      registerDto.password,
      registerDto.tenantSlug,
      registerDto.firstName,
      registerDto.lastName,
      registerDto.phone,
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyDto.token, verifyDto.tenantSlug);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(
      forgotDto.email,
      forgotDto.tenantSlug,
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetDto.token,
      resetDto.password,
      resetDto.tenantSlug,
    );
  }

  @Post('login/email')
  @HttpCode(HttpStatus.OK)
  async loginWithEmail(@Body() loginDto: LoginEmailDto) {
    return this.authService.loginWithEmail(
      loginDto.email,
      loginDto.password,
      loginDto.tenantSlug,
    );
  }

  @Post('login/google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(@Body() loginDto: LoginGoogleDto) {
    return this.authService.loginWithGoogle(
      loginDto.googleToken,
      loginDto.tenantSlug,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Request() req) {
    await this.authService.logout(req.session.token);
  }

  @Post('me')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req) {
    return {
      user: req.user,
      session: {
        tenantId: req.session.tenantId,
        expiresAt: req.session.expiresAt,
      },
    };
  }
}

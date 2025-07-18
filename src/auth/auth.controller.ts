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
import { LoginEmailDto, LoginGoogleDto, RefreshTokenDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../config/config-service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/AuthService';
import { OAuth2Service } from './services/OAuth2Service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get('JWT_SECRET', 'your-secret-key')!,
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, AuthService, OAuth2Service],
  exports: [JwtAuthGuard, RolesGuard, JwtModule, AuthService, OAuth2Service],
})
export class WorkschdAuthModule {}

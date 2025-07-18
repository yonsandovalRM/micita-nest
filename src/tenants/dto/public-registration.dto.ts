import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class PublicTenantRegistrationDto {
  // Información del tenant
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\s]+$/, {
    message: 'El nombre solo puede contener letras, números y espacios',
  })
  tenantName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  tenantSlug: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsEnum(['clinic', 'salon', 'consultancy', 'spa', 'gym', 'other'])
  @IsOptional()
  businessType?: string;

  // Información del usuario propietario
  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  ownerFirstName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ownerLastName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  // Plan seleccionado
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: 'monthly' | 'yearly';

  // Términos y condiciones
  @IsOptional()
  acceptTerms?: boolean;
}

export class CheckSlugAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  slug: string;
}

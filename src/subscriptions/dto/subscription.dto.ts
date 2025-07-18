import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  IsOptional,
  IsUrl,
  IsObject,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsEmail()
  payerEmail: string;

  @IsOptional()
  @IsObject()
  backUrls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
}

export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  data?: any;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

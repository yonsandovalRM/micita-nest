import { SetMetadata } from '@nestjs/common';

export interface FeatureAccessConfig {
  feature: string;
  usage?: number;
  message?: string;
}

export const RequireFeature = (
  feature: string | FeatureAccessConfig,
  usage?: number,
  message?: string,
) => {
  const config: FeatureAccessConfig =
    typeof feature === 'string' ? { feature, usage, message } : feature;

  return SetMetadata('featureAccess', config);
};

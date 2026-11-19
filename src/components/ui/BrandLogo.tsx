import { Image } from 'expo-image';

const LOGO = require('../../../assets/images/icon.png');

type BrandLogoProps = {
  size?: number;
};

export function BrandLogo({ size = 64 }: BrandLogoProps) {
  return (
    <Image
      source={LOGO}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
      }}
      contentFit="cover"
      transition={120}
    />
  );
}

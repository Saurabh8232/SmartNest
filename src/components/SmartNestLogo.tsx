import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

const smartNestLogo = require('../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png');

export default function SmartNestLogo({
  size,
  style,
}: {
  size: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={smartNestLogo}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});

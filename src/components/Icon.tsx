import React from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';

export type IconName = keyof typeof Feather.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#1F2022', style }) => {
  return <Feather name={name} size={size} color={color} style={style} />;
};


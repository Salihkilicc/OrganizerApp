import type { ImageSourcePropType } from 'react-native';

export const AVATAR_NAMES = [
  'avatar1',
  'avatar2',
  'avatar3',
  'avatar4',
  'avatar5',
  'avatar6',
  'avatar7',
  'avatar8',
  'avatar9',
  'avatar10',
] as const;

export type AvatarName = (typeof AVATAR_NAMES)[number];

export const FREE_AVATARS: AvatarName[] = ['avatar1', 'avatar2', 'avatar3'];
export const AVATAR_PRICE = 100;

export const AVATAR_IMAGES: Record<AvatarName, ImageSourcePropType> = {
  avatar1: require('../../assets/avatars/avatar1.png'),
  avatar2: require('../../assets/avatars/avatar2.png'),
  avatar3: require('../../assets/avatars/avatar3.png'),
  avatar4: require('../../assets/avatars/avatar4.png'),
  avatar5: require('../../assets/avatars/avatar5.png'),
  avatar6: require('../../assets/avatars/avatar6.png'),
  avatar7: require('../../assets/avatars/avatar7.png'),
  avatar8: require('../../assets/avatars/avatar8.png'),
  avatar9: require('../../assets/avatars/avatar9.png'),
  avatar10: require('../../assets/avatars/avatar10.png'),
};

export const getAvatarPrice = (name: AvatarName) =>
  FREE_AVATARS.includes(name) ? 0 : AVATAR_PRICE;

export const AVATAR_CATALOG = AVATAR_NAMES.map((name, index) => ({
  name,
  label: `Avatar ${index + 1}`,
  price: getAvatarPrice(name),
  source: AVATAR_IMAGES[name],
}));

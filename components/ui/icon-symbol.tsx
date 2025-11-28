// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'banknote.fill': 'attach-money',
  'briefcase.fill': 'work',
  'arrow.down.circle.fill': 'arrow-circle-down',
  'moon.stars.fill': 'nights-stay',
  'dollarsign.circle.fill': 'monetization-on',
  'pencil.circle.fill': 'edit',
  'checkmark.circle.fill': 'check-circle',
  'plus.circle.fill': 'add-circle',
  calendar: 'calendar-today',
  'arrow.right.circle': 'arrow-circle-right',
  'arrow.right.circle.fill': 'arrow-circle-right',
  'list.bullet': 'format-list-bulleted',
  tray: 'inventory-2',
  'trash.fill': 'delete',
  'sun.max.fill': 'wb-sunny',
  'mic.fill': 'mic',
  'stop.fill': 'stop-circle',
  'play.fill': 'play-circle',
  'camera.fill': 'photo-camera',
  'photo.fill': 'photo',
  'xmark.circle.fill': 'cancel',
  'folder.fill': 'folder',
  waveform: 'graphic-eq',
  'moon.fill': 'brightness-3',
  'bell.fill': 'notifications',
  'music.note': 'music-note',
  touchid: 'fingerprint',
  'lock.shield.fill': 'security',
  'person.fill': 'person',
  'lock.fill': 'lock',
  clock: 'schedule',
  'creditcard.fill': 'credit-card',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

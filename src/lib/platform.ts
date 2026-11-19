import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/** Native gets bottom sheets; web gets centered dialogs. */
export const sheetPresentation: 'sheet' | 'dialog' = isWeb ? 'dialog' : 'sheet';

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_JOIN_KEY = 'needcart.pendingJoinCode';

export async function setPendingJoinCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_JOIN_KEY, code.toUpperCase());
  } catch {
    // Non-critical: the user can still enter the code manually.
  }
}

export async function consumePendingJoinCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_JOIN_KEY);
    if (code) {
      await AsyncStorage.removeItem(PENDING_JOIN_KEY);
    }
    return code;
  } catch {
    return null;
  }
}

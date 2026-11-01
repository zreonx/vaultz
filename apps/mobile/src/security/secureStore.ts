import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "vaultz_auth_token";
const USER_KEY = "vaultz_user_profile";
const BIOMETRIC_ENABLED_KEY = "vaultz_biometric_enabled";
const HIDE_BALANCE_KEY = "vaultz_hide_balance";

export const secureStore = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignore
    }
  },

  async saveUserProfile(userJson: string): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, userJson);
  },

  async getUserProfile(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_KEY);
    } catch {
      return null;
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return val === "true";
    } catch {
      return false;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
  },

  async isHideBalanceEnabled(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(HIDE_BALANCE_KEY);
      return val === "true";
    } catch {
      return false;
    }
  },

  async setHideBalanceEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(HIDE_BALANCE_KEY, String(enabled));
  },

  async clearAll(): Promise<void> {
    await secureStore.removeToken();
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(HIDE_BALANCE_KEY);
    } catch {
      // Ignore
    }
  },

  async getItemAsync(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore
    }
  },
};

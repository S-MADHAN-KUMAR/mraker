import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithFingerprint: () => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authStatus = await AsyncStorage.getItem('isAuthenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Check credentials against database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        return false;
      }

      await AsyncStorage.setItem('isAuthenticated', 'true');
      await AsyncStorage.setItem('username', username);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithFingerprint = async (): Promise<boolean> => {
    try {
      // Check if device supports biometric authentication
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return false;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return false;
      }

      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to login',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        // If biometric auth succeeds, verify user credentials
        const username = 'ejaz';
        const password = '123';
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .single();

        if (error || !data) {
          return false;
        }

        await AsyncStorage.setItem('isAuthenticated', 'true');
        await AsyncStorage.setItem('username', username);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Fingerprint login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('isAuthenticated');
      await AsyncStorage.removeItem('username');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        loginWithFingerprint,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


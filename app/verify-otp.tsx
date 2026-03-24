import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const OTP_LENGTH = 8;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp, resendOtp, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState(params.email ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [formError, setFormError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const validate = () => {
    if (!email.trim()) {
      setFormError('Email is missing. Please go back and sign up again.');
      return false;
    }

    if (!otpCode.trim()) {
      setFormError('Please enter the OTP code.');
      return false;
    }

    if (otpCode.trim().length !== OTP_LENGTH) {
      setFormError(`OTP must be exactly ${OTP_LENGTH} digits.`);
      return false;
    }

    return true;
  };

  const handleVerify = async () => {
    try {
      clearError();
      setFormError('');

      if (!validate()) {
        return;
      }

      await verifyOtp(email.trim(), otpCode.trim());

      Alert.alert('Verified', 'Email verified successfully.', [
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)/explore'),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setFormError(message);
    }
  };

  const handleResend = async () => {
    try {
      clearError();
      setFormError('');

      if (!email.trim()) {
        setFormError('Email is missing. Please go back and sign up again.');
        return;
      }

      await resendOtp(email.trim());
      setOtpCode('');
      setResendCountdown(30);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your email.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not resend OTP';
      setFormError(message);
    }
  };

  const displayError = formError || error;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Confirm OTP Verification</Text>
        <Text style={styles.subtitle}>Enter the {OTP_LENGTH}-digit code sent to</Text>
        <Text style={styles.email}>{email || 'your email address'}</Text>

        {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

        <TextInput
          value={otpCode}
          onChangeText={setOtpCode}
          maxLength={OTP_LENGTH}
          keyboardType="number-pad"
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor="#5a8ebd"
          editable={!loading}
        />

        <Pressable
          style={({ pressed }) => [styles.verifyButton, { opacity: pressed || loading ? 0.8 : 1 }]}
          onPress={handleVerify}
          disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.verifyText}>Verify OTP</Text>}
        </Pressable>

        <View style={styles.row}>
          <Text style={styles.helpText}>Did not receive code? </Text>
          {resendCountdown > 0 ? (
            <Text style={styles.countdown}>Resend in {resendCountdown}s</Text>
          ) : (
            <Pressable onPress={handleResend} disabled={loading}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.replace('/signup')} disabled={loading}>
          <Text style={styles.backText}>Back to Signup</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152238',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a3a52',
    borderColor: '#3b7ca4',
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#b8d4e8',
    fontSize: 14,
    textAlign: 'center',
  },
  email: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb1b1',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 13,
  },
  otpInput: {
    backgroundColor: '#0f2741',
    color: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b7ca4',
    borderRadius: 10,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  verifyButton: {
    backgroundColor: '#3b7ca4',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 12,
  },
  verifyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpText: {
    color: '#ffffff',
    fontSize: 13,
  },
  resendText: {
    color: '#5bb3e6',
    fontWeight: '700',
    fontSize: 13,
  },
  countdown: {
    color: '#b8d4e8',
    fontSize: 13,
    fontWeight: '600',
  },
  backText: {
    color: '#5bb3e6',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
});

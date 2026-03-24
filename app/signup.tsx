import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, loading, error, clearError } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const validateRegistrationForm = () => {
    if (!formData.fullName.trim()) {
      setFormError('Please enter your full name');
      return false;
    }
    if (!formData.email.trim()) {
      setFormError('Please enter your email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setFormError('Please enter your phone number');
      return false;
    }
    if (!formData.password.trim()) {
      setFormError('Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match');
      return false;
    }
    if (!agreeToTerms) {
      setFormError('Please agree to terms and conditions');
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    try {
      clearError();
      setFormError('');

      if (!validateRegistrationForm()) {
        return;
      }

      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone: formData.phone,
      });

      router.replace(`/verify-otp?email=${encodeURIComponent(formData.email)}` as never);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Signup failed';
      setFormError(errorMsg);
      Alert.alert('Signup Error', errorMsg);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const displayError = formError || error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Join Portal Services to get started</Text>
        </View>

        {displayError && (
          <View style={[styles.errorBox, { backgroundColor: '#fee', borderColor: '#f33' }]}>
            <Text style={[styles.errorText, { color: '#d00' }]}>⚠️ {displayError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  color: colors.text,
                  borderColor: colors.icon,
                },
              ]}
              placeholder="John Doe"
              placeholderTextColor={colors.icon}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  color: colors.text,
                  borderColor: colors.icon,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  color: colors.text,
                  borderColor: colors.icon,
                },
              ]}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.icon}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  borderColor: colors.icon,
                },
              ]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                editable={!loading}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.toggleButton}>
                <Text style={[styles.toggleText, { color: colors.tint }]}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  borderColor: colors.icon,
                },
              ]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.icon}
                secureTextEntry={!showConfirmPassword}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.toggleButton}>
                <Text style={[styles.toggleText, { color: colors.tint }]}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.checkboxContainer}>
            <Pressable
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              style={[
                styles.checkbox,
                {
                  backgroundColor: agreeToTerms ? colors.tint : 'transparent',
                  borderColor: colors.icon,
                },
              ]}>
              {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
            <Text style={[styles.termsText, { color: colors.text }]}>I agree to the Terms & Conditions</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.signupButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed || loading ? 0.8 : 1,
              },
            ]}
            onPress={handleSignup}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signupButtonText}>Continue</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.text }]}>Already have an account? </Text>
          <Pressable onPress={handleLogin}>
            <Text style={[styles.loginLink, { color: colors.tint }]}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  toggleButton: {
    padding: 8,
  },
  toggleText: {
    fontSize: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 13,
    flex: 1,
  },
  signupButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 10,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

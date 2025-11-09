import { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  Box,
  VStack,
  Heading,
  Text,
  Input,
  InputField,
  Button,
  ButtonText,
  ButtonSpinner,
  FormControl,
  FormControlError,
  FormControlErrorText,
  HStack,
  Pressable,
  Alert,
  AlertIcon,
  AlertText,
  InfoIcon,
} from '@gluestack-ui/themed';
import { useSession, signUp } from '../../../lib/auth-client';
import { useRouter } from 'solito/router';

export function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const { data: session } = useSession();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session, router]);

  const validateForm = () => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setError('');

    if (!name || name.trim().length < 2) {
      setNameError('Please enter your name (at least 2 characters)');
      isValid = false;
    }

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      }, {
        onSuccess: () => {
          router.push('/');
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Failed to create account. Please try again.');
        },
      });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Box flex={1} bg="$white" justifyContent="center" px="$6" py="$8">
          <Box maxWidth={400} width="100%" alignSelf="center">
            <VStack space="lg">
              {/* Header */}
              <VStack space="xs">
                <Heading size="3xl" color="$text900">
                  Create Account
                </Heading>
                <Text size="md" color="$text600">
                  Sign up to get started with Booktractor
                </Text>
              </VStack>

              {/* Error Alert */}
              {error ? (
                <Alert action="error" variant="solid">
                  <AlertIcon as={InfoIcon} />
                  <AlertText>{error}</AlertText>
                </Alert>
              ) : null}

              {/* Name Input */}
              <FormControl isInvalid={!!nameError}>
                <VStack space="xs">
                  <Text size="sm" fontWeight="$semibold" color="$text900">
                    Name
                  </Text>
                  <Input variant="outline" size="lg">
                    <InputField
                      placeholder="Enter your full name"
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        setNameError('');
                      }}
                      autoCapitalize="words"
                      autoComplete="name"
                      editable={!isLoading}
                    />
                  </Input>
                  {nameError ? (
                    <FormControlError>
                      <FormControlErrorText>{nameError}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              {/* Email Input */}
              <FormControl isInvalid={!!emailError}>
                <VStack space="xs">
                  <Text size="sm" fontWeight="$semibold" color="$text900">
                    Email
                  </Text>
                  <Input variant="outline" size="lg">
                    <InputField
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setEmailError('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isLoading}
                    />
                  </Input>
                  {emailError ? (
                    <FormControlError>
                      <FormControlErrorText>{emailError}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              {/* Password Input */}
              <FormControl isInvalid={!!passwordError}>
                <VStack space="xs">
                  <Text size="sm" fontWeight="$semibold" color="$text900">
                    Password
                  </Text>
                  <Input variant="outline" size="lg">
                    <InputField
                      placeholder="Create a password (min 8 characters)"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setPasswordError('');
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </Input>
                  {passwordError ? (
                    <FormControlError>
                      <FormControlErrorText>{passwordError}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              {/* Confirm Password Input */}
              <FormControl isInvalid={!!confirmPasswordError}>
                <VStack space="xs">
                  <Text size="sm" fontWeight="$semibold" color="$text900">
                    Confirm Password
                  </Text>
                  <Input variant="outline" size="lg">
                    <InputField
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setConfirmPasswordError('');
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </Input>
                  {confirmPasswordError ? (
                    <FormControlError>
                      <FormControlErrorText>{confirmPasswordError}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </VStack>
              </FormControl>

              {/* Create Account Button */}
              <Button
                size="lg"
                variant="solid"
                action="primary"
                onPress={handleRegister}
                isDisabled={isLoading}
                mt="$2"
              >
                {isLoading ? (
                  <ButtonSpinner />
                ) : (
                  <ButtonText>Create Account</ButtonText>
                )}
              </Button>

              {/* Login Link */}
              <HStack justifyContent="center" mt="$4">
                <Text size="sm" color="$text600">
                  Already have an account?{' '}
                </Text>
                <Pressable
                  onPress={() => router.push('/auth/login')}
                  isDisabled={isLoading}
                >
                  <Text size="sm" fontWeight="$semibold" color="$primary600">
                    Sign In
                  </Text>
                </Pressable>
              </HStack>
            </VStack>
          </Box>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

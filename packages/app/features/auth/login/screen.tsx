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
  Divider,
  HStack,
  Pressable,
  Alert,
  AlertIcon,
  AlertText,
  InfoIcon,
} from '@gluestack-ui/themed';
import { useSession, signIn } from '../../../lib/auth-client';
import { useRouter } from 'solito/router';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
    setEmailError('');
    setPasswordError('');
    setError('');

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
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleEmailLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await signIn.email({
        email,
        password,
      }, {
        onSuccess: () => {
          router.push('/');
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Failed to sign in. Please check your credentials.');
        },
      });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signIn.social({
        provider: 'google',
      }, {
        onSuccess: () => {
          router.push('/');
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Failed to sign in with Google');
        },
      });
    } catch (err) {
      setError('An unexpected error occurred');
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
                  Welcome Back
                </Heading>
                <Text size="md" color="$text600">
                  Sign in to continue to Booktractor
                </Text>
              </VStack>

              {/* Error Alert */}
              {error ? (
                <Alert action="error" variant="solid">
                  <AlertIcon as={InfoIcon} />
                  <AlertText>{error}</AlertText>
                </Alert>
              ) : null}

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
                      placeholder="Enter your password"
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

              {/* Sign In Button */}
              <Button
                size="lg"
                variant="solid"
                action="primary"
                onPress={handleEmailLogin}
                isDisabled={isLoading}
                mt="$2"
              >
                {isLoading ? (
                  <ButtonSpinner />
                ) : (
                  <ButtonText>Sign In</ButtonText>
                )}
              </Button>

              {/* Divider */}
              <HStack space="md" alignItems="center" my="$2">
                <Divider flex={1} />
                <Text size="sm" color="$text500">
                  OR
                </Text>
                <Divider flex={1} />
              </HStack>

              {/* Google Sign In Button */}
              <Button
                size="lg"
                variant="outline"
                action="secondary"
                onPress={handleGoogleLogin}
                isDisabled={isLoading}
              >
                <ButtonText>Continue with Google</ButtonText>
              </Button>

              {/* Register Link */}
              <HStack justifyContent="center" mt="$4">
                <Text size="sm" color="$text600">
                  Don't have an account?{' '}
                </Text>
                <Pressable
                  onPress={() => router.push('/auth/register')}
                  isDisabled={isLoading}
                >
                  <Text size="sm" fontWeight="$semibold" color="$primary600">
                    Sign Up
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

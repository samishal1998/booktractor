import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { useRouter } from 'solito/navigation'
import { useTRPC, useTRPCClient } from '../../lib/trpc'
import { useQuery, useMutation } from '@tanstack/react-query'

export function ProfileScreen() {
  const router = useRouter()
  const trpc = useTRPC()
  const { data: session, isPending: sessionLoading } = useSession()
  const client = useTRPCClient()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })

  // Fetch user profile from API
  const { data: userProfile, isLoading: profileLoading, refetch } = useQuery(
    trpc.profile.getProfile.queryOptions(
      { userId: session?.user?.id || '' },
      { enabled: !!session?.user?.id }
    )
  )

  // Update form data when profile is loaded
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        zipCode: userProfile.zipCode || '',
      })
    }
  }, [userProfile])

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      return await client.profile.updateProfile.mutate({
        userId: session.user.id,
        name: data.name,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.zipCode || undefined,
      })
    },
    onSuccess: () => {
      setIsEditing(false)
      refetch()
      alert('Profile updated successfully!')
    },
    onError: (error) => {
      alert(`Failed to update profile: ${error.message}`)
    },
  })

  if (sessionLoading || profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading profile...</Text>
      </View>
    )
  }

  if (!session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
          Sign In Required
        </Text>
        <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          You need to be signed in to view your profile
        </Text>
        <Pressable
          onPress={() => router.push('/auth/login')}
          style={{ padding: 12, backgroundColor: '#3b82f6', borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Sign In</Text>
        </Pressable>
      </View>
    )
  }

  const handleSave = async () => {
    await updateProfileMutation.mutateAsync(formData)
  }

  const handleCancel = () => {
    // Reset form to original values from userProfile
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        zipCode: userProfile.zipCode || '',
      })
    }
    setIsEditing(false)
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: 'white',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>My Profile</Text>
            <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              Manage your account information
            </Text>
          </View>

          {!isEditing ? (
            <Pressable
              onPress={() => setIsEditing(true)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: '#3b82f6',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={handleCancel}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: updateProfileMutation.isPending ? '#d1d5db' : '#10b981',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* Profile Picture Placeholder */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#3b82f6',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 48, color: 'white' }}>
              {formData.name?.charAt(0).toUpperCase() || '👤'}
            </Text>
          </View>
          {isEditing && (
            <Pressable
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#374151', fontWeight: '500' }}>Change Photo</Text>
            </Pressable>
          )}
        </View>

        {/* Personal Information */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            Personal Information
          </Text>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Full Name
              </Text>
              {isEditing ? (
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    fontSize: 16,
                  }}
                  placeholder="Enter your full name"
                />
              ) : (
                <Text style={{ fontSize: 16, color: '#111827' }}>{formData.name || 'Not set'}</Text>
              )}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Email Address
              </Text>
              {isEditing ? (
                <TextInput
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    fontSize: 16,
                  }}
                  placeholder="Enter your email"
                />
              ) : (
                <Text style={{ fontSize: 16, color: '#111827' }}>{formData.email || 'Not set'}</Text>
              )}
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Phone Number
              </Text>
              {isEditing ? (
                <TextInput
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    fontSize: 16,
                  }}
                  placeholder="Enter your phone number"
                />
              ) : (
                <Text style={{ fontSize: 16, color: '#111827' }}>{formData.phone || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Address Information */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Address</Text>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Street Address
              </Text>
              {isEditing ? (
                <TextInput
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    fontSize: 16,
                  }}
                  placeholder="Enter your street address"
                />
              ) : (
                <Text style={{ fontSize: 16, color: '#111827' }}>
                  {formData.address || 'Not set'}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}
                >
                  City
                </Text>
                {isEditing ? (
                  <TextInput
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                    style={{
                      backgroundColor: '#f9fafb',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      fontSize: 16,
                    }}
                    placeholder="City"
                  />
                ) : (
                  <Text style={{ fontSize: 16, color: '#111827' }}>
                    {formData.city || 'Not set'}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}
                >
                  State
                </Text>
                {isEditing ? (
                  <TextInput
                    value={formData.state}
                    onChangeText={(text) => setFormData({ ...formData, state: text })}
                    style={{
                      backgroundColor: '#f9fafb',
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      fontSize: 16,
                    }}
                    placeholder="State"
                  />
                ) : (
                  <Text style={{ fontSize: 16, color: '#111827' }}>
                    {formData.state || 'Not set'}
                  </Text>
                )}
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                ZIP Code
              </Text>
              {isEditing ? (
                <TextInput
                  value={formData.zipCode}
                  onChangeText={(text) => setFormData({ ...formData, zipCode: text })}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    fontSize: 16,
                  }}
                  placeholder="Enter ZIP code"
                />
              ) : (
                <Text style={{ fontSize: 16, color: '#111827' }}>
                  {formData.zipCode || 'Not set'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            Account Settings
          </Text>

          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => router.push('/profile/change-password')}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 16, color: '#374151' }}>Change Password</Text>
              <Text style={{ color: '#6b7280' }}>→</Text>
            </Pressable>

            <Pressable
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <Text style={{ fontSize: 16, color: '#374151' }}>Notification Preferences</Text>
              <Text style={{ color: '#6b7280' }}>→</Text>
            </Pressable>

            <Pressable
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 16, color: '#ef4444' }}>Delete Account</Text>
              <Text style={{ color: '#ef4444' }}>→</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

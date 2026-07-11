import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import { UnreadProvider } from './context/UnreadContext';
import LoadingSpinner from './components/LoadingSpinner';
import { useAndroidImmersive } from './hooks/useAndroidImmersive';
import { navigationRef } from './lib/navigation';
import { registerForPushNotifications, setupPushListeners } from './lib/push';

// Auth screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgetPasswordScreen from './screens/ForgetPasswordScreen';

// Main tab navigator
import BottomTabs from './screens/BottomTabs';

// Stack screens (accessible from inside tabs)
import PetDetailScreen from './screens/PetDetailScreen';
import PostListingScreen from './screens/PostListingScreen';
import BreedSelectScreen from './screens/BreedSelectScreen';
import MyListingsScreen from './screens/MyListingsScreen';
import SellerProfileScreen from './screens/SellerProfileScreen';
import ConversationScreen from './screens/ConversationScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import HelpScreen from './screens/HelpScreen';
import AboutScreen from './screens/AboutScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import ManageAccountPrivacyScreen from './screens/ManageAccountPrivacyScreen';
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import FAQsScreen from './screens/FAQsScreen';
import ContactSupportScreen from './screens/ContactSupportScreen';
import ReportProblemScreen from './screens/ReportProblemScreen';
import AppFeedbackScreen from './screens/AppFeedbackScreen';
import CommunityGuidelinesScreen from './screens/CommunityGuidelinesScreen';

const Stack = createNativeStackNavigator();

function PushBootstrap() {
  const { user } = useAuth();

  // Register the device for pushes whenever a user signs in.
  useEffect(() => {
    if (!user?.id) return;
    registerForPushNotifications();
  }, [user?.id]);

  // Listen for taps + foreground deliveries. Runs once for the app's lifetime.
  useEffect(() => setupPushListeners(), []);

  return null;
}

function RootNavigator() {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Auth flow */}
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='Signup' component={SignupScreen} />
      <Stack.Screen name='ForgotPassword' component={ForgetPasswordScreen} />

      {/* Main app */}
      <Stack.Screen name='Main' component={BottomTabs} />

      {/* Stack screens pushed over tabs */}
      <Stack.Screen name='PetDetail' component={PetDetailScreen} />
      <Stack.Screen name='PostListing' component={PostListingScreen} />
      <Stack.Screen name='BreedSelect' component={BreedSelectScreen} />
      <Stack.Screen name='MyListings' component={MyListingsScreen} />
      <Stack.Screen name='SellerProfile' component={SellerProfileScreen} />
      <Stack.Screen name='Conversation' component={ConversationScreen} />
      <Stack.Screen name='Notifications' component={NotificationsScreen} />
      <Stack.Screen name='Privacy' component={PrivacyScreen} />
      <Stack.Screen name='Help' component={HelpScreen} />
      <Stack.Screen name='About' component={AboutScreen} />
      <Stack.Screen name='ChangePassword' component={ChangePasswordScreen} />
      <Stack.Screen name='ManageAccountPrivacy' component={ManageAccountPrivacyScreen} />
      <Stack.Screen name='NotificationPreferences' component={NotificationPreferencesScreen} />
      <Stack.Screen name='Terms' component={TermsScreen} />
      <Stack.Screen name='PrivacyPolicy' component={PrivacyPolicyScreen} />
      <Stack.Screen name='FAQs' component={FAQsScreen} />
      <Stack.Screen name='ContactSupport' component={ContactSupportScreen} />
      <Stack.Screen name='ReportProblem' component={ReportProblemScreen} />
      <Stack.Screen name='AppFeedback' component={AppFeedbackScreen} />
      <Stack.Screen name='CommunityGuidelines' component={CommunityGuidelinesScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  useAndroidImmersive();
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <AuthProvider>
        <UnreadProvider>
          <NavigationContainer ref={navigationRef}>
            <PushBootstrap />
            <RootNavigator />
          </NavigationContainer>
        </UnreadProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

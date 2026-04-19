import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';

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

const Stack = createNativeStackNavigator();

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
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

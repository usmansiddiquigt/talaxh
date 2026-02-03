import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ForgotPasswordScreen from './screens/ForgetPasswordScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

// NEW: bottom tabs
import BottomTabs from './screens/BottomTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName='Login'
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name='Login' component={LoginScreen} />
        <Stack.Screen name='Signup' component={SignupScreen} />
        <Stack.Screen name='ForgotPassword' component={ForgotPasswordScreen} />

        {/* After login, go here */}
        <Stack.Screen name='Main' component={BottomTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import { createNavigationContainerRef } from '@react-navigation/native';

// Single navigation ref the rest of the app can import from anywhere.
// App.js wires it into <NavigationContainer ref={navigationRef}> and
// lib/push.js uses it to navigate when a push notification is tapped.
export const navigationRef = createNavigationContainerRef();

import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';

import AccountScreen from './AccountScreen';
import FavoritesScreen from './FavoritesScreen';
import HomeScreen from './HomeScreen';
import MessagesScreen from './MessagesScreen';

const Tab = createBottomTabNavigator();
const PRIMARY = '#2C097F';
const INACTIVE = '#94a3b8';

// Placeholder for Post — FAB navigates via stack
function PostPlaceholder() { return null; }

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name='Home'
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name='home' size={24} color={color} />,
        }}
      />

      <Tab.Screen
        name='Messages'
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color }) => <MaterialIcons name='chat-bubble-outline' size={22} color={color} />,
        }}
      />

      {/* Center FAB — taps navigate to PostListing stack screen */}
      <Tab.Screen
        name='PostTab'
        component={PostPlaceholder}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={styles.fabWrap}>
              <View style={styles.fab}>
                <MaterialIcons name='add' size={30} color='#fff' />
              </View>
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('PostListing');
          },
        })}
      />

      <Tab.Screen
        name='Favorites'
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color }) => <MaterialIcons name='favorite-border' size={22} color={color} />,
        }}
      />

      <Tab.Screen
        name='Account'
        component={AccountScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => <MaterialIcons name='person-outline' size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  label: { fontSize: 10, fontWeight: '700' },
  fabWrap: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
});

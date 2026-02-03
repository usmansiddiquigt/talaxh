import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';

// Screens
import AccountScreen from './AccountScreen'; // Dashboard/Profile (the code I gave you)
import WelcomeScreen from './WelcomeScreen'; // Home

// Simple placeholders (you can replace later)
import { Text } from 'react-native';
function ChatsScreen() {
  return <Text style={{ padding: 20 }}>Chats coming soon</Text>;
}
function MyAdsScreen() {
  return <Text style={{ padding: 20 }}>My Ads coming soon</Text>;
}
function SellScreen() {
  return <Text style={{ padding: 20 }}>Sell/Create Ad coming soon</Text>;
}

const Tab = createBottomTabNavigator();

const PRIMARY = '#2C097F';
const INACTIVE = '#94a3b8';

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
        component={WelcomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name='home' size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name='Chats'
        component={ChatsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name='chat-bubble' size={22} color={color} />
          ),
        }}
      />

      {/* Center Floating Action Button */}
      <Tab.Screen
        name='Sell'
        component={SellScreen}
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
            // Optional: prevent default if you want a modal
            // e.preventDefault();
            // navigation.navigate('SellModal');
          },
        })}
      />

      <Tab.Screen
        name='MyAds'
        component={MyAdsScreen}
        options={{
          tabBarLabel: 'My Ads',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name='favorite' size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name='Account'
        component={AccountScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name='person'
              size={24}
              color={focused ? PRIMARY : color}
            />
          ),
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
  label: {
    fontSize: 10,
    fontWeight: '800',
  },
  fabWrap: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26, // lift up
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    borderWidth: 4,
    borderColor: '#fff',
  },
});

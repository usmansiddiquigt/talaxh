// Shared side drawer (burger menu) — used by the Home page and the
// category listing pages so both feel like top-level screens.
//
// Usage:
//   const [drawerOpen, setDrawerOpen] = useState(false);
//   <AppDrawer
//     open={drawerOpen}
//     onClose={() => setDrawerOpen(false)}
//     onNavigate={(screen) => { ... }}   // screen === null → "Home"
//   />

import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#2C097F';
const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SCREEN_W * 0.78);

const MENU_ITEMS = [
  { icon: 'home',                label: 'Home',           screen: null          },
  { icon: 'post-add',            label: 'Post a Listing', screen: 'PostListing' },
  { icon: 'list-alt',            label: 'My Listings',    screen: 'MyListings'  },
  { icon: 'favorite-border',     label: 'Saved Pets',     screen: 'Favorites'   },
  { icon: 'chat-bubble-outline', label: 'Messages',       screen: 'Messages'    },
  { icon: 'person-outline',      label: 'Account',        screen: 'Account'     },
];

export default function AppDrawer({ open, onClose, onNavigate }) {
  const drawerAnim  = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(drawerAnim,  { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(drawerAnim,  { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0,         duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [open]);

  if (!mounted) return null;

  const handleItem = (screen) => {
    onClose();
    // Give the close animation a beat before navigating.
    setTimeout(() => onNavigate(screen), 240);
  };

  return (
    <>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="pets" size={26} color="#fff" />
          </View>
          <Text style={styles.title}>Talash</Text>
          <Text style={styles.sub}>Find your perfect pet</Text>
        </View>

        <View style={styles.list}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.item}
              onPress={() => handleItem(item.screen)}
            >
              <MaterialIcons name={item.icon} size={22} color={PRIMARY} />
              <Text style={styles.itemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 20,
  },
  drawer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: DRAWER_W,
    backgroundColor: '#fff',
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 2, height: 0 },
    elevation: 10,
  },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  sub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  list:  { paddingTop: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemText: { fontSize: 15, fontWeight: '600', color: '#0d121b' },
});

import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function LoadingSpinner({ color = '#2C097F', size = 'large' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

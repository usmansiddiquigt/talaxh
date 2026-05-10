import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export default function StarRating({ rating = 0, max = 5, size = 16 }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => (
        <MaterialIcons
          key={i}
          name={i < Math.floor(rating) ? 'star' : i < rating ? 'star-half' : 'star-border'}
          size={size}
          color="#F4A724"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});

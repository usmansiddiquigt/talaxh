import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ImageCarousel({ photos = [], height = 300 }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);

  if (!photos.length) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <MaterialIcons name="pets" size={64} color="#cbd5e1" />
        <Text style={styles.placeholderText}>No photos</Text>
      </View>
    );
  }

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setCurrent(idx);
  };

  return (
    <View style={{ height }}>
      <FlatList
        ref={ref}
        data={photos}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width: SCREEN_W, height }} resizeMode="cover" />
        )}
      />
      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>
      )}
      <View style={styles.counter}>
        <Text style={styles.counterText}>{current + 1}/{photos.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#94a3b8', marginTop: 8, fontSize: 14 },
  dots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff', width: 16 },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

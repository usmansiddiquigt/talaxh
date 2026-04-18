import { StyleSheet, Text, View } from 'react-native';

const PRIMARY = '#2C097F';

export default function StepProgressBar({ current, total }) {
  const progress = ((current - 1) / (total - 1)) * 100;
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.label}>Step {current} of {total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingVertical: 12 },
  track: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
});

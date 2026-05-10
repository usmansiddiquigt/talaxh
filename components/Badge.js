import { StyleSheet, Text, View } from 'react-native';

const VARIANTS = {
  free:     { bg: '#dcfce7', text: '#16a34a' },
  adoption: { bg: '#dbeafe', text: '#1d4ed8' },
  sold:     { bg: '#fee2e2', text: '#dc2626' },
  draft:    { bg: '#f1f5f9', text: '#64748b' },
  verified: { bg: '#ede9fe', text: '#7c3aed' },
  swap:     { bg: '#fef3c7', text: '#d97706' },
  new:      { bg: '#f0fdf4', text: '#15803d' },
  missing:  { bg: '#fef9c3', text: '#b45309' },
};

export default function Badge({ label, variant = 'verified', style }) {
  const { bg, text } = VARIANTS[variant] || VARIANTS.verified;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700' },
});

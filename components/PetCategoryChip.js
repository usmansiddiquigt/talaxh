import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const ICONS = {
  all:        'pets',
  dogs:       'pets',
  cats:       'emoji-nature',
  birds:      'flutter-dash',
  rabbits:    'cruelty-free',
  fish:       'water',
  reptiles:   'bug-report',
  'small-pets': 'favorite',
};

const PRIMARY = '#2C097F';

export default function PetCategoryChip({ category, label, active, onPress }) {
  const icon = ICONS[category] || 'pets';
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.activeChip]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons name={icon} size={16} color={active ? '#fff' : PRIMARY} />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  label: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  activeLabel: { color: '#fff' },
});

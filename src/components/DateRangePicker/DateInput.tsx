import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { inputStyles as s, ACCENT } from './styles';
import { DateInputProps } from './types';
import colors from '../../constants/colors';

const MONTH_ABBR = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function formatDate(d: Date): string {
  return `${MONTH_ABBR[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`;
}

export default function DateInput({ label, date, placeholder, isActive, onPress }: DateInputProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.box, isActive && s.boxActive]}
    >
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <Icon
          name="calendar"
          size={13}
          color={isActive ? ACCENT : colors.mutedForeground}
        />
        {date ? (
          <Text style={s.dateText}>{formatDate(date)}</Text>
        ) : (
          <Text style={s.placeholder}>{placeholder}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { headerStyles as s } from './styles';
import { CalendarHeaderProps } from './types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function CalendarHeader({
  visibleMonth,
  minimumDate,
  maximumDate,
  onPrev,
  onNext,
}: CalendarHeaderProps) {
  const canGoPrev = !isSameMonth(visibleMonth, minimumDate);
  const canGoNext = !isSameMonth(visibleMonth, maximumDate);

  return (
    <View style={s.row}>
      <TouchableOpacity
        onPress={onPrev}
        disabled={!canGoPrev}
        style={[s.navBtn, !canGoPrev && s.navBtnDisabled]}
        activeOpacity={0.7}
      >
        <Icon name="chevron-left" size={16} color="#e8f0fe" />
      </TouchableOpacity>

      <Text style={s.monthLabel}>
        {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        disabled={!canGoNext}
        style={[s.navBtn, !canGoNext && s.navBtnDisabled]}
        activeOpacity={0.7}
      >
        <Icon name="chevron-right" size={16} color="#e8f0fe" />
      </TouchableOpacity>
    </View>
  );
}

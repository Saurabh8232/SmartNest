// Single calendar day cell with range styling.
import React, { memo, useCallback } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { dayCellStyles as s, RANGE_BG } from './styles';
import { DayCellProps } from './types';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function stripTime(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function DayCell({
  date,
  selectedFrom,
  selectedTo,
  minimumDate,
  maximumDate,
  isToday,
  onPress,
}: DayCellProps) {
  const ts = stripTime(date);
  const min = stripTime(minimumDate);
  const max = stripTime(maximumDate);

  const isDisabled = ts < min || ts > max;
  const isFrom = selectedFrom ? isSameDay(date, selectedFrom) : false;
  const isTo = selectedTo ? isSameDay(date, selectedTo) : false;
  const isSelected = isFrom || isTo;

  const fromTs = selectedFrom ? stripTime(selectedFrom) : null;
  const toTs = selectedTo ? stripTime(selectedTo) : null;
  const inRange = fromTs !== null && toTs !== null && ts > fromTs && ts < toTs;

  const showLeftBar = inRange || isTo;
  const showRightBar = inRange || (isFrom && selectedTo !== null);

  const handlePress = useCallback(() => {
    if (!isDisabled) onPress(date);
  }, [isDisabled, onPress, date]);

  return (
    <View style={s.cellWrapper}>
      {showLeftBar && (
        <View style={[s.leftBar, { backgroundColor: RANGE_BG }]} />
      )}
      {showRightBar && (
        <View style={[s.rightBar, { backgroundColor: RANGE_BG }]} />
      )}

      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.65}
        style={s.pillTouch}
      >
        <View style={[s.pill, isSelected && s.pillSelected]}>
          <Text
            style={[
              s.dayNumber,
              isDisabled && s.dayNumberDisabled,
              isSelected && s.dayNumberSelected,
              !isSelected && !isDisabled && inRange && s.dayNumberInRange,
            ]}
          >
            {date.getDate()}
          </Text>
        </View>
        {isToday && !isSelected && <View style={s.todayDot} />}
      </TouchableOpacity>
    </View>
  );
}

export default memo(DayCell, (prev, next) => {
  const sameFrom =
    (prev.selectedFrom?.getTime() ?? null) ===
    (next.selectedFrom?.getTime() ?? null);
  const sameTo =
    (prev.selectedTo?.getTime() ?? null) ===
    (next.selectedTo?.getTime() ?? null);
  return (
    sameFrom &&
    sameTo &&
    prev.date.getTime() === next.date.getTime() &&
    prev.minimumDate.getTime() === next.minimumDate.getTime() &&
    prev.maximumDate.getTime() === next.maximumDate.getTime() &&
    prev.isToday === next.isToday
  );
});

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, useWindowDimensions } from 'react-native';
import { calendarStyles as s } from './styles';
import { CalendarProps } from './types';
import CalendarHeader from './CalendarHeader';
import DayCell from './DayCell';

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Convert JS day (0=Sun) to Mon-first index (0=Mon … 6=Sun)
function toMonFirst(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function buildDayCells(year: number, month: number): (Date | null)[] {
  const firstDay  = new Date(year, month, 1);
  const offset    = toMonFirst(firstDay.getDay()); // blank cells before day 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar({
  visibleMonth,
  selectedFrom,
  selectedTo,
  minimumDate,
  maximumDate,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: CalendarProps) {
  const { width: screenWidth } = useWindowDimensions();
  // Approximate slide distance = popup width minus its padding
  const slideWidth = screenWidth * 0.88 - 32;

  const slideAnim  = useRef(new Animated.Value(0)).current;
  const prevMonth  = useRef(visibleMonth);
  const today      = useMemo(() => new Date(), []);

  useEffect(() => {
    const prev = prevMonth.current;
    prevMonth.current = visibleMonth;

    const isForward =
      visibleMonth.getFullYear() > prev.getFullYear() ||
      (visibleMonth.getFullYear() === prev.getFullYear() &&
        visibleMonth.getMonth() > prev.getMonth());

    // Snap to incoming direction, then spring to 0
    slideAnim.setValue(isForward ? slideWidth : -slideWidth);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMonth]);

  const cells = useMemo(
    () => buildDayCells(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  return (
    <View style={s.root}>
      <CalendarHeader
        visibleMonth={visibleMonth}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
      />

      {/* Week day header */}
      <View style={s.weekRow}>
        {WEEK_DAYS.map(d => (
          <Text key={d} style={s.weekDayLabel}>{d}</Text>
        ))}
      </View>

      {/* Animated day grid */}
      <Animated.View style={[s.grid, { transform: [{ translateX: slideAnim }] }]}>
        {cells.map((date, idx) =>
          date ? (
            <DayCell
              key={date.getTime()}
              date={date}
              selectedFrom={selectedFrom}
              selectedTo={selectedTo}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              isToday={
                date.getFullYear() === today.getFullYear() &&
                date.getMonth()    === today.getMonth()    &&
                date.getDate()     === today.getDate()
              }
              onPress={onDayPress}
            />
          ) : (
            <View key={`empty-${idx}`} style={{ width: '14.2857%', height: 38 }} />
          ),
        )}
      </Animated.View>
    </View>
  );
}

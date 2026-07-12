import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { pickerStyles as s } from './styles';
import { DateRangePickerProps } from './types';
import Calendar from './Calendar';
import DateInput from './DateInput';

// ── Helpers ───────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ── Component ─────────────────────────────────────────────────────
export default function DateRangePicker({
  fromDate,
  toDate,
  minimumDate,
  maximumDate,
  onApply,
  onCancel,
  disabled = false,
  openSignal,
  showTrigger = true,
}: DateRangePickerProps) {
  const { width: sw, height: sh } = useWindowDimensions();

  // ── Internal state ──────────────────────────────────────────────
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFrom,   setSelectedFrom]   = useState<Date | null>(fromDate);
  const [selectedTo,     setSelectedTo]     = useState<Date | null>(toDate);
  const [activeField,    setActiveField]    = useState<'from' | 'to'>('from');
  const [visibleMonth,   setVisibleMonth]   = useState<Date>(() =>
    startOfMonth(fromDate ?? new Date()),
  );

  // ── Animations ──────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const lastOpenSignalRef = useRef(openSignal);

  const openModal = useCallback(() => {
    if (disabled) return;
    setSelectedFrom(fromDate);
    setSelectedTo(toDate);
    setVisibleMonth(startOfMonth(fromDate ?? new Date()));
    setIsModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [disabled, fadeAnim, fromDate, scaleAnim, toDate]);

  useEffect(() => {
    if (openSignal === undefined || lastOpenSignalRef.current === openSignal) return;
    lastOpenSignalRef.current = openSignal;
    openModal();
  }, [openModal, openSignal]);

  const closeModal = useCallback((cancelled = false) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setIsModalVisible(false);
      if (cancelled) {
        // Revert draft selections to last committed values
        setSelectedFrom(fromDate);
        setSelectedTo(toDate);
        setVisibleMonth(startOfMonth(fromDate ?? new Date()));
        onCancel?.();
      }
    });
  }, [fadeAnim, scaleAnim, fromDate, toDate, onCancel]);

  // ── Day tap logic ───────────────────────────────────────────────
  const handleDayPress = useCallback((date: Date) => {
    const d = startOfDay(date);

    if (activeField === 'from' || !selectedFrom || (selectedFrom && selectedTo)) {
      // Start a fresh selection
      setSelectedFrom(d);
      setSelectedTo(null);
      setActiveField('to');
      return;
    }

    // Second tap — setting TO
    if (isSameDay(d, selectedFrom)) {
      // Tapped the same day as FROM — treat as single-day range
      setSelectedTo(d);
      setActiveField('from');
      return;
    }

    if (d < selectedFrom) {
      // Tapped before FROM → make it the new FROM and restart
      setSelectedFrom(d);
      setSelectedTo(null);
      setActiveField('to');
      return;
    }

    // Valid TO date
    setSelectedTo(d);
    setActiveField('from');
  }, [activeField, selectedFrom, selectedTo]);

  // ── Month navigation ────────────────────────────────────────────
  const handlePrevMonth = useCallback(() => {
    setVisibleMonth(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (next < startOfMonth(minimumDate)) return prev;
      return next;
    });
  }, [minimumDate]);

  const handleNextMonth = useCallback(() => {
    setVisibleMonth(prev => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (next > startOfMonth(maximumDate)) return prev;
      return next;
    });
  }, [maximumDate]);

  // ── Apply ───────────────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!selectedFrom || !selectedTo) return;
    onApply(selectedFrom, selectedTo);
    closeModal(false);
  }, [selectedFrom, selectedTo, onApply, closeModal]);

  const canApply = selectedFrom !== null && selectedTo !== null;

  // ── Popup dimensions ────────────────────────────────────────────
  const popupWidth   = sw * 0.88;
  const popupMaxHeight = sh * 0.62;

  return (
    <>
      {/* ── Inline trigger row (always visible on History screen) ── */}
      {showTrigger && (
        <View style={s.triggerRow}>
          <DateInput
            label="FROM"
            date={fromDate}
            placeholder="Jan 01, 2026"
            isActive={false}
            onPress={openModal}
          />
          <Icon name="arrow-right" size={14} color="#8a9bb5" />
          <DateInput
            label="TO"
            date={toDate}
            placeholder="Dec 31, 2030"
            isActive={false}
            onPress={openModal}
          />
        </View>
      )}

      {/* ── Floating popup ──────────────────────────────────────── */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeModal(true)}
      >
        <TouchableWithoutFeedback onPress={() => closeModal(true)}>
          <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback onPress={() => { /* absorb touches inside popup */ }}>
              <Animated.View
                style={[
                  s.popup,
                  { width: popupWidth, maxHeight: popupMaxHeight, transform: [{ scale: scaleAnim }] },
                ]}
              >
                {/* FROM → TO inputs inside popup (show active state) */}
                <View style={s.popupInputRow}>
                  <DateInput
                    label="FROM"
                    date={selectedFrom}
                    placeholder="Jan 01, 2026"
                    isActive={activeField === 'from'}
                    onPress={() => setActiveField('from')}
                  />
                  <Icon name="arrow-right" size={14} color="#8a9bb5" />
                  <DateInput
                    label="TO"
                    date={selectedTo}
                    placeholder="Dec 31, 2030"
                    isActive={activeField === 'to'}
                    onPress={() => setActiveField('to')}
                  />
                </View>

                {/* Calendar */}
                <Calendar
                  visibleMonth={visibleMonth}
                  selectedFrom={selectedFrom}
                  selectedTo={selectedTo}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onDayPress={handleDayPress}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />

                <View style={s.divider} />

                {/* Cancel / Apply */}
                <View style={s.btnRow}>
                  <TouchableOpacity
                    onPress={() => closeModal(true)}
                    style={s.cancelBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleApply}
                    disabled={!canApply}
                    style={[s.applyBtn, !canApply && s.applyBtnDisabled]}
                    activeOpacity={0.8}
                  >
                    <Text style={s.applyText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

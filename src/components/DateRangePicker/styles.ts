// Shared styles for the date range picker.
import { StyleSheet } from 'react-native';
import colors from '../../constants/colors';

export const CELL_HEIGHT = 38;
export const PILL_SIZE = 32;
export const BAR_HEIGHT = 26;
export const BAR_TOP = (CELL_HEIGHT - BAR_HEIGHT) / 2;
export const RANGE_BG = 'rgba(108,99,255,0.18)';
export const ACCENT = '#6c63ff';
export const TODAY_DOT = '#00d4ff';

export const dayCellStyles = StyleSheet.create({
  cellWrapper: {
    width: '14.2857%',
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: BAR_TOP,
    height: BAR_HEIGHT,
    width: '50%',
    backgroundColor: RANGE_BG,
  },
  rightBar: {
    position: 'absolute',
    right: 0,
    top: BAR_TOP,
    height: BAR_HEIGHT,
    width: '50%',
    backgroundColor: RANGE_BG,
  },
  pillTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pill: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: ACCENT,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
  },
  dayNumberDisabled: {
    color: colors.mutedForeground,
    opacity: 0.4,
  },
  dayNumberSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayNumberInRange: {
    color: colors.foreground,
  },
  todayDot: {
    position: 'absolute',
    bottom: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TODAY_DOT,
  },
});

export const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: 0.3,
  },
});

export const calendarStyles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekDayLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
    paddingBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.2857%',
    height: CELL_HEIGHT,
  },
});

export const inputStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  boxActive: {
    borderColor: ACCENT,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  placeholder: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.mutedForeground,
    flex: 1,
  },
});

export const pickerStyles = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popup: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  popupInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});

// Date range picker prop types.
export interface DateRangePickerProps {
  fromDate: Date | null;
  toDate: Date | null;
  minimumDate: Date;
  maximumDate: Date;
  onApply: (from: Date, to: Date) => void;
  onCancel?: () => void;
  disabled?: boolean;
  openSignal?: number;
  showTrigger?: boolean;
}

export interface CalendarProps {
  visibleMonth: Date;
  selectedFrom: Date | null;
  selectedTo: Date | null;
  minimumDate: Date;
  maximumDate: Date;
  onDayPress: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export interface DayCellProps {
  date: Date;
  selectedFrom: Date | null;
  selectedTo: Date | null;
  minimumDate: Date;
  maximumDate: Date;
  isToday: boolean;
  onPress: (date: Date) => void;
}

export interface DateInputProps {
  label: string;
  date: Date | null;
  placeholder: string;
  isActive: boolean;
  onPress: () => void;
}

export interface CalendarHeaderProps {
  visibleMonth: Date;
  minimumDate: Date;
  maximumDate: Date;
  onPrev: () => void;
  onNext: () => void;
}

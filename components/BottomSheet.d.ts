import { ReactNode, ViewStyle } from 'react-native';
import { AppColors } from '@/constants/theme';

export interface BottomSheetProps {
  /** Controlled open state */
  open: boolean;
  /** Called when the user taps the scrim or drags the sheet down to dismiss */
  onClose: () => void;
  /** Heading rendered at the top of the sheet */
  title?: string;
  /** Sheet body content */
  children?: ReactNode;
  /** Whether a downward drag dismisses the sheet. Default: true */
  dragToDismiss?: boolean;
  /** Theme colors */
  theme?: AppColors;
  /** Custom container style */
  style?: ViewStyle;
}

export declare function BottomSheet(props: BottomSheetProps): JSX.Element;

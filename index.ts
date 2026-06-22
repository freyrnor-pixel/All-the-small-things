/**
 * UnFocus Design System — component index
 * Import everything from '@/components/ui' for convenience.
 */

// Core
export { Button }                             from './core/Button';
export { IconButton }                         from './core/IconButton';
export { Badge, Chip, Avatar }                from './core/Badge';

// Forms
export { Checkbox, Switch, SegmentedControl, Input } from './forms/FormComponents';

// Surfaces
export { Card, HintCard }                     from './surfaces/Card';

// Feedback
export { TaskItem }                           from './feedback/TaskItem';
export type { Task }                          from './feedback/TaskItem';
export { ProgressBar }                        from './feedback/TaskItem';
export { BubbleMenu }                         from './feedback/BubbleMenu';
export type { BubbleItem }                    from './feedback/BubbleMenu';

// Theme
export { ThemeProvider, useTheme }            from './ThemeProvider';

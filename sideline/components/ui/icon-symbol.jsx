import {
  AlertCircle,
  Calendar,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Code2,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Home,
  Info,
  List,
  Lock,
  LogOut,
  Mail,
  Menu,
  Mic,
  MicOff,
  Moon,
  Pause,
  Pencil,
  Play,
  Plus,
  PlusCircle,
  RotateCw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
  Users,
  AudioWaveform,
  X,
  XCircle,
} from 'lucide-react-native';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': Home,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code2,
  'person.fill': User,
  'chevron.right': ChevronRight,
  'chevron.left': ChevronLeft,
  'gearshape.fill': Settings,
  'mic.fill': Mic,
  waveform: AudioWaveform,
  'mic.slash': MicOff,
  'list.bullet': List,
  xmark: X,
  'line.3.horizontal': Menu,
  'line.3.horizontal.decrease.circle': Filter,
  'rectangle.portrait.and.arrow.right': LogOut,
  pencil: Pencil,
  moon: Moon,
  envelope: Mail,
  lock: Lock,
  sportscourt: Circle,
  camera: Camera,
  'doc.text': FileText,
  'plus.circle': PlusCircle,
  sparkles: Sparkles,
  'arrow.clockwise': RotateCw,
  calendar: Calendar,
  'play.fill': Play,
  'pause.fill': Pause,
  trash: Trash2,
  'info.circle': Info,
  'exclamationmark.circle.fill': AlertCircle,
  eye: Eye,
  'eye.slash': EyeOff,
  'chevron.up': ChevronUp,
  'chevron.down': ChevronDown,
  'xmark.circle.fill': XCircle,
  'person.2': Users,
  plus: Plus,
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}) {
  const IconComponent = MAPPING[name] ?? Circle;
  return <IconComponent color={color} size={size} style={style} strokeWidth={2.2} />;
}

import { Button } from 'tamagui';
import { Send } from '@tamagui/lucide-icons';

interface SendButtonProps {
  disabled: boolean;
  hasText: boolean;
}

export default function SendButton({ disabled, hasText }: SendButtonProps) {
  return (
    <Button
      disabled={disabled || !hasText}
      backgroundColor={disabled || !hasText ? '#ccc' : '#3b82f6'}
      color="white"
      size="$3"
      borderRadius={6}
      padding={8}
    >
      <Send size={16} color="currentColor" />
    </Button>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { YStack, Text, H1 } from 'tamagui';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      backgroundColor="#fff"
      height="100vh"
    >
      <Text fontSize={40} fontWeight="bold" marginBottom={16} color="#000">
        Welcome to Palladium
      </Text>
    </YStack>
  );
}

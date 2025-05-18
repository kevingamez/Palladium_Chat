import { View, Text } from 'tamagui';

interface FileIconProps {
  filename: string;
}

export default function FileIcon({ filename }: FileIconProps) {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    return (
      <View
        backgroundColor="#F15642"
        width={50}
        height={50}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontWeight="bold">
          PDF
        </Text>
      </View>
    );
  }

  return (
    <View
      backgroundColor="#A7BBCC"
      width={50}
      height={50}
      borderRadius={8}
      alignItems="center"
      justifyContent="center"
    >
      <Text color="white" fontWeight="bold">
        {extension?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

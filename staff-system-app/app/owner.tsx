import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Owner() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      
      <Text style={{ fontSize: 24 }}>Owner Panel</Text>

      <Pressable onPress={() => router.push('/create')}>
        <Text style={{ marginTop: 20 }}>Create Manual</Text>
      </Pressable>

    </View>
  );
}
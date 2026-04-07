import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Staff Ready</Text>

      <Text style={{ marginTop: 10 }}>Train less. Work faster.</Text>

      <Pressable onPress={() => router.push('/owner')} style={{ marginTop: 20 }}>
        <Text>Go to Owner</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/staff')} style={{ marginTop: 10 }}>
        <Text>Go to Staff</Text>
      </Pressable>
    </View>
  );
}
import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';

export default function Create() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  const autoOrganize = async () => {
    if (!input.trim()) return;

    const res = await fetch('/api/organize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    const data = await res.json();
    setResult(data.result);
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Create Manual</Text>

      <Text style={{ marginTop: 8, color: '#555' }}>
        Paste raw instructions and turn them into a clean task list.
      </Text>

      <TextInput
        placeholder="Example: turn on coffee machine, clean the store, check inventory"
        value={input}
        onChangeText={setInput}
        multiline
        style={{
          marginTop: 20,
          minHeight: 140,
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 12,
          padding: 14,
          backgroundColor: 'white',
          textAlignVertical: 'top',
        }}
      />

      <Pressable
        onPress={autoOrganize}
        style={{
          marginTop: 16,
          backgroundColor: 'black',
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Auto Organize</Text>
      </Pressable>

      <View
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 12,
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#ddd',
          minHeight: 160,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Result
        </Text>

        <Text>{result || 'Organized result will appear here.'}</Text>
      </View>
    </View>
  );
}
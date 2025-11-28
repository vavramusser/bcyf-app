// app/_layout.tsx

import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { loadAllItems } from "../types";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        await loadAllItems();
        setLoading(false);
      } catch (err) {
        console.error('Error loading database:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading BCYF data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Error Loading Data</Text>
        <Text style={{ color: '#666', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
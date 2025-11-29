// app/(tabs)/index.tsx

import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, TextInput } from "react-native";
import { ALL_ITEMS } from "../../types";
import { getUpNextEvents, UpNextItem, getEasternTime } from "../../lib/upNext";
import { divisionTint } from "../../lib/divisioncolors";

export default function Home() {
  const [upNext, setUpNext] = useState<UpNextItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Test mode
  const [testMode, setTestMode] = useState(false);
  const [testHour, setTestHour] = useState("9");
  const [testMinute, setTestMinute] = useState("00");
  const [testAmPm, setTestAmPm] = useState<"AM" | "PM">("AM");

  const loadUpNext = () => {
    let simulatedDate = new Date();
    
    // If test mode, create a date with the test time (in Eastern)
    if (testMode) {
      const hours = parseInt(testHour) || 9;
      const minutes = parseInt(testMinute) || 0;
      let adjustedHours = hours;
      if (testAmPm === 'PM' && hours !== 12) adjustedHours += 12;
      if (testAmPm === 'AM' && hours === 12) adjustedHours = 0;
      
      // Create a fake "Eastern" time by setting it directly
      // The getUpNextEvents function will treat this as if it's already in Eastern
      simulatedDate.setHours(adjustedHours, minutes, 0, 0);
    }
    
    setCurrentTime(simulatedDate);
    const events = getUpNextEvents(ALL_ITEMS, simulatedDate, testMode);
    setUpNext(events);
  };

  useEffect(() => {
    loadUpNext();
    
    if (!testMode) {
      const interval = setInterval(() => {
        loadUpNext();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [testMode, testHour, testMinute, testAmPm]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUpNext();
    setRefreshing(false);
  };

  const formatMinutesUntil = (minutes?: number) => {
    if (minutes === undefined) return '';
    if (minutes <= 0) return 'Happening now!';
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `in ${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'happening-now': return '#10b981';
      case 'up-next': return '#f59e0b';
      case 'coming-soon': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'happening-now': return 'HAPPENING NOW';
      case 'up-next': return 'UP NEXT';
      case 'coming-soon': return 'COMING SOON';
      default: return '';
    }
  };

  const formatDisplayTime = (date: Date) => {
    const displayDate = testMode ? date : getEasternTime(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[displayDate.getDay()];
    const monthName = months[displayDate.getMonth()];
    const dayOfMonth = displayDate.getDate();
    
    let hours = displayDate.getHours();
    const minutes = displayDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${dayName}, ${monthName} ${dayOfMonth} • ${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 48, paddingHorizontal: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 4 }}>BCYF</Text>
      <Text style={{ fontSize: 16, color: "#666", marginBottom: 20 }}>
        {formatDisplayTime(currentTime)} {testMode ? '(Test)' : 'ET'}
      </Text>

      <Pressable
        onPress={() => setTestMode(!testMode)}
        style={{
          backgroundColor: testMode ? '#f59e0b' : '#eee',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontWeight: '600', textAlign: 'center' }}>
          {testMode ? '🧪 Test Mode ON' : 'Enable Test Mode'}
        </Text>
      </Pressable>

      {testMode && (
        <View style={{
          backgroundColor: '#fff',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#ddd',
          marginBottom: 12,
        }}>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Simulate Time (Eastern):</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={testHour}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && (text === '' || parseInt(text) <= 12)) {
                  setTestHour(text);
                }
              }}
              placeholder="9"
              keyboardType="number-pad"
              maxLength={2}
              style={{
                width: 50,
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 6,
                padding: 8,
                fontSize: 16,
                textAlign: 'center',
              }}
            />
            <Text style={{ fontSize: 18, fontWeight: '600' }}>:</Text>
            <TextInput
              value={testMinute}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && (text === '' || parseInt(text) < 60)) {
                  setTestMinute(text.padStart(2, '0'));
                }
              }}
              placeholder="00"
              keyboardType="number-pad"
              maxLength={2}
              style={{
                width: 50,
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 6,
                padding: 8,
                fontSize: 16,
                textAlign: 'center',
              }}
            />
            <Pressable
              onPress={() => setTestAmPm(testAmPm === 'AM' ? 'PM' : 'AM')}
              style={{
                backgroundColor: '#0a7ea4',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>{testAmPm}</Text>
            </Pressable>
            <Pressable
              onPress={loadUpNext}
              style={{
                backgroundColor: '#10b981',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Go</Text>
            </Pressable>
          </View>
        </View>
      )}

      {upNext.length === 0 ? (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
            No events right now
          </Text>
          <Text style={{ color: "#666", textAlign: "center" }}>
            {testMode 
              ? "Try a different time to see events!" 
              : "Check back during fair hours to see what's happening!"
            }
          </Text>
        </View>
      ) : (
        <>
          {upNext.map((item) => {
            const bg = divisionTint(item.division, 0.12);
            const statusColor = getStatusColor(item.status);
            
            return (
              <View
                key={item.id}
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(0, 0, 0, 0.06)",
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: bg,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View
                    style={{
                      backgroundColor: statusColor,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                  {item.minutesUntil !== undefined && (
                    <Text style={{ fontSize: 13, color: "#666", fontWeight: "600" }}>
                      {formatMinutesUntil(item.minutesUntil)}
                    </Text>
                  )}
                </View>

                <Text style={{ fontSize: 16, fontWeight: "700" }}>
                  {item.classNumber ? `Class #${item.classNumber} · ` : ""}
                  {item.title}
                </Text>

                <Text style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                  {item.time} • {item.location}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  {item.division && (
                    <Text
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "#ddd",
                        fontSize: 12,
                        marginRight: 8,
                      }}
                    >
                      {item.division}
                    </Text>
                  )}
                  {item.classType && (
                    <Text style={{ fontSize: 12, color: "#666" }}>{item.classType}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}
      
      <Text style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 20 }}>
        Pull down to refresh {testMode && '• Test Mode Active'}
      </Text>
    </ScrollView>
  );
}
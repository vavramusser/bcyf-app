// app/(tabs)/myschedule.tsx

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { SectionList, Text, View, Pressable } from "react-native";
import { divisionTint } from "../../lib/divisioncolors";
import { getFavorites, toggleFavorite } from "../../lib/favorites";
import { getSessionInfo } from "../../lib/database";
import { ALL_ITEMS } from "../../types";
import { DayName, DAYS, FairItem } from "../../types/event_types";
import { EventDetailModal } from "../../lib/EventDetailModal";

const DAY_ORDER: Record<DayName, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function labelFor(item: FairItem) {
  const left = item.time
    ? item.time
    : `${item.location} • #${item.order ?? "?"} in order`;
  return `${item.day} • ${left}`;
}

type Section = { title: DayName; data: FairItem[] };

export default function MySchedule() {
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<FairItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    sessionName?: string;
    totalClasses?: number;
    sessionStartTime?: string;
  } | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getFavorites().then((set) => mounted && setFavIds(set));
      return () => { mounted = false; };
    }, [])
  );

const sections: Section[] = useMemo(() => {
  const picked = ALL_ITEMS.filter((i) => favIds.has(i.id));

  // Helper function to parse time strings into minutes since midnight
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 9999; // No time goes to the end
    
    const cleaned = timeStr.replace('~', '').trim();
    const match = cleaned.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 9999;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  picked.sort((a, b) => {
    // First sort by day
    const d = DAY_ORDER[a.day] - DAY_ORDER[b.day];
    if (d !== 0) return d;
    
    // Then sort by time (properly parsed)
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    if (timeA !== timeB) return timeA - timeB;
    
    // If same time, sort by location
    const r = a.location.localeCompare(b.location);
    if (r !== 0) return r;
    
    // Finally by order within location
    return (a.order ?? 9999) - (b.order ?? 9999);
  });

  const byDay = new Map<DayName, FairItem[]>();
  for (const it of picked) {
    if (!byDay.has(it.day)) byDay.set(it.day, []);
    byDay.get(it.day)!.push(it);
  }

  const out: Section[] = [];
  for (const day of DAYS) {
    const data = byDay.get(day as DayName);
    if (data && data.length) out.push({ title: day as DayName, data });
  }
  return out;
}, [favIds]);

  const handleEventPress = async (event: FairItem) => {
    setSelectedEvent(event);
    setModalVisible(true);
    
    // Fetch session info from the database
    // We need to get the sessionId - let's find it from ALL_ITEMS
    const fullEvent = ALL_ITEMS.find(e => e.id === event.id);
    if (fullEvent && (fullEvent as any).sessionId) {
      const info = await getSessionInfo((fullEvent as any).sessionId);
      if (info) {
        setSessionInfo(info);
      }
    }
  };

  const handleToggleSave = async () => {
    if (selectedEvent) {
      const newFavs = await toggleFavorite(selectedEvent.id);
      setFavIds(newFavs);
      setModalVisible(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: 48, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>My Schedule</Text>

      <SectionList<FairItem>
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const bg = divisionTint(item.division, 0.12);

          return (
            <Pressable onPress={() => handleEventPress(item)}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.06)",
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: bg,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700" }}>
                  {item.classNumber ? `Class #${item.classNumber} · ` : ""}
                  {item.title}
                </Text>
                <Text style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                  {item.time || 'TBD'} · {item.location}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: "#666", textAlign: "center" }}>
              No saved items yet. Tap "☆ Save" on any entry in Explore.
            </Text>
          </View>
        }
      />

      <EventDetailModal
        visible={modalVisible}
        event={selectedEvent}
        isSaved={selectedEvent ? favIds.has(selectedEvent.id) : false}
        onClose={() => setModalVisible(false)}
        onToggleSave={handleToggleSave}
        sessionInfo={sessionInfo}
      />
    </View>
  );
}
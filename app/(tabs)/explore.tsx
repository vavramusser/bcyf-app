// app/(tabs)/explore.tsx

import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { divisionTint, getDivisionColor } from "../../lib/divisioncolors";
import { getFavorites, toggleFavorite } from "../../lib/favorites";
import { ALL_ITEMS } from "../../types";
import { DayName, DAYS, Division, DIVISIONS, FairItem } from "../../types/event_types";

const DAY_ORDER: Record<DayName, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

function Chip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#111" : "#ccc",
        backgroundColor: active ? "#eee" : "#fff",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: "#111" }}>{label}</Text>
    </Pressable>
  );
}

function labelFor(item: FairItem) {
  const left = item.time
    ? item.time
    : `${item.location} • class #${item.order ?? "?"} of the day`;
  return `${item.day} • ${left}`;
}

export default function Explore() {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState<Division | "All">("All");
  const [day, setDay] = useState<DayName | "All">("All");
  const [kind, setKind] = useState<"All" | "Class" | "Event">("All");
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    getFavorites().then(setFavs);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = ALL_ITEMS.filter((i) => {
      if (division !== "All" && i.division !== division) return false;
      if (day !== "All" && i.day !== day) return false;
      if (kind !== "All" && i.kind !== kind) return false;
      if (!q) return true;
      const hay = `${i.title} ${i.classNumber ?? ""} ${i.classType ?? ""} ${i.eventType ?? ""} ${i.division ?? ""} ${i.location}`.toLowerCase();
      return hay.includes(q);
    });

  return items.sort((a, b) => {
    // First sort by day
    const dayA = DAY_ORDER[a.day] ?? 999; // Handle undefined days
    const dayB = DAY_ORDER[b.day] ?? 999;
    const dayDiff = dayA - dayB;
    if (dayDiff !== 0) return dayDiff;
    
    // Then sort by time (parse properly to handle AM/PM)
    const parseTime = (timeStr?: string) => {
      if (!timeStr) return 9999; // Items without time go to the end
      const cleaned = timeStr.replace('~', '').trim(); // Remove ~ from estimated times
      const match = cleaned.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 9999;
      
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes; // Return total minutes since midnight
    };
    
    const timeA = parseTime(a.time);
    const timeB = parseTime(b.time);
    
    if (timeA !== timeB) return timeA - timeB;
    
    // If same time, sort by location
    const locationDiff = a.location.localeCompare(b.location);
    if (locationDiff !== 0) return locationDiff;
    
    // Finally by order within location
    return (a.order ?? 9999) - (b.order ?? 9999);
  });
  }, [query, division, day, kind]);

  return (
    <View style={{ flex: 1, paddingTop: 48, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>Explore</Text>

      <TextInput
        placeholder="Search by number or name…"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        style={{
          borderWidth: 1, borderColor: "#ccc", borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10, fontSize: 16,
          backgroundColor: "white", marginBottom: 10,
        }}
      />

      <Text style={{ fontWeight: "700", marginBottom: 6 }}>Division</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        <Chip label="All" active={division === "All"} onPress={() => setDivision("All")} />
        {DIVISIONS.map((d) => (
          <Chip key={d} label={d} active={division === d} onPress={() => setDivision(d)} />
        ))}
      </View>

      <Text style={{ fontWeight: "700", marginBottom: 6 }}>Day</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        <Chip label="All" active={day === "All"} onPress={() => setDay("All")} />
        {DAYS.map((d) => (
          <Chip key={d} label={d} active={day === d} onPress={() => setDay(d)} />
        ))}
      </View>

      <Text style={{ fontWeight: "700", marginBottom: 6 }}>Type</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        {(["All", "Class", "Event"] as const).map((k) => (
          <Chip key={k} label={k} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>

      <FlatList<FairItem>
        data={filtered}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const saved = favs.has(item.id);
          const bg = divisionTint(item.division, 0.12);
          return (
            <View
              style={{
                borderWidth: 1,
                borderColor: "rgba(0, 0, 0, 0.06)",
                borderRadius: 16,
                padding: 14,
                backgroundColor: bg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", flexShrink: 1 }}>
                  {item.classNumber ? `Class #${item.classNumber} · ` : ""}
                  {item.title}
                </Text>
                <Pressable
                  onPress={async () => setFavs(await toggleFavorite(item.id))}
                  style={{ marginLeft: "auto", paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 14 }}>{saved ? "★ Saved" : "☆ Save"}</Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
                {labelFor(item)}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                {item.division && (
                  <Text
                    style={{
                      paddingHorizontal: 8, paddingVertical: 4,
                      borderRadius: 999, borderWidth: 1, borderColor: "#ddd", fontSize: 12,
                      marginRight: 8,
                    }}
                  >
                    {item.division}
                  </Text>
                )}
                {item.classType && (
                  <Text style={{ fontSize: 12, color: "#666", marginRight: 8 }}>{item.classType}</Text>
                )}
                {item.eventType && (
                  <Text style={{ fontSize: 12, color: "#666" }}>{item.eventType}</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: "#666" }}>No results.</Text>
          </View>
        }
      />
    </View>
  );
}
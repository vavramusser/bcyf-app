import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { divisionTint } from "../../lib/divisioncolors";
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

export default function Explore() {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState<Division | "All">("All");
  const [classGroup, setClassGroup] = useState<string | "All">("All");
  const [classSubgroup, setClassSubgroup] = useState<string | "All">("All");
  const [classSubsubgroup, setClassSubsubgroup] = useState<string | "All">("All");
  const [day, setDay] = useState<DayName | "All">("All");
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    getFavorites().then(setFavs);
  }, []);

  // Get available class groups for the selected division
  const availableClassGroups = useMemo(() => {
    if (division === "All") return [];
    
    const groupsSet = new Set<string>();
    ALL_ITEMS.forEach(item => {
      const itemDivisions = (item as any).divisions 
        ? (item as any).divisions.split(';').map((d: string) => d.trim())
        : [item.division];
      
      if (itemDivisions.includes(division)) {
        if ((item as any).classGroup) {
          groupsSet.add((item as any).classGroup);
        }
        // Add special categories for Events and Reminders
        if (item.kind === 'Event') {
          groupsSet.add('Events');
        }
        if (item.kind === 'Reminder') {
          groupsSet.add('Exhibitor Reminders');
        }
      }
    });
    
    return Array.from(groupsSet).sort((a, b) => {
      // Sort with "Events" and "Exhibitor Reminders" at the end
      if (a === 'Events') return 1;
      if (b === 'Events') return -1;
      if (a === 'Exhibitor Reminders') return 1;
      if (b === 'Exhibitor Reminders') return -1;
      return a.localeCompare(b);
    });
  }, [division]);

  // Get available subgroups for the selected division and class group
  const availableSubgroups = useMemo(() => {
    if (division === "All" || classGroup === "All") return [];
    // Don't show subgroups for Events or Reminders
    if (classGroup === "Events" || classGroup === "Exhibitor Reminders") return [];
    
    const subgroupsSet = new Set<string>();
    ALL_ITEMS.forEach(item => {
      const itemDivisions = (item as any).divisions 
        ? (item as any).divisions.split(';').map((d: string) => d.trim())
        : [item.division];
      
      if (itemDivisions.includes(division) && 
          (item as any).classGroup === classGroup && 
          (item as any).classSubgroup) {
        subgroupsSet.add((item as any).classSubgroup);
      }
    });
    
    return Array.from(subgroupsSet).sort();
  }, [division, classGroup]);

  // Get available sub-subgroups
  const availableSubsubgroups = useMemo(() => {
    if (division === "All" || classGroup === "All" || classSubgroup === "All") return [];
    // Don't show subsubgroups for Events or Reminders
    if (classGroup === "Events" || classGroup === "Exhibitor Reminders") return [];
    
    const subsubgroupsSet = new Set<string>();
    ALL_ITEMS.forEach(item => {
      const itemDivisions = (item as any).divisions 
        ? (item as any).divisions.split(';').map((d: string) => d.trim())
        : [item.division];
      
      if (itemDivisions.includes(division) && 
          (item as any).classGroup === classGroup && 
          (item as any).classSubgroup === classSubgroup &&
          (item as any).classSubsubgroup) {
        subsubgroupsSet.add((item as any).classSubsubgroup);
      }
    });
    
    return Array.from(subsubgroupsSet).sort();
  }, [division, classGroup, classSubgroup]);

  // Get available days based on all filters
  const availableDays = useMemo(() => {
    if (division === "All") return DAYS;
    
    const daysSet = new Set<DayName>();
    ALL_ITEMS.forEach(item => {
      // Check if item matches the selected division
      const itemDivisions = (item as any).divisions 
        ? (item as any).divisions.split(';').map((d: string) => d.trim())
        : [item.division];
      
      if (itemDivisions.includes(division)) {
        // Handle special category filters
        if (classGroup !== "All") {
          if (classGroup === "Events" && item.kind !== "Event") return;
          if (classGroup === "Exhibitor Reminders" && item.kind !== "Reminder") return;
          if (classGroup !== "Events" && classGroup !== "Exhibitor Reminders" && (item as any).classGroup !== classGroup) return;
        }
        
        if (classSubgroup !== "All" && (item as any).classSubgroup !== classSubgroup) return;
        if (classSubsubgroup !== "All" && (item as any).classSubsubgroup !== classSubsubgroup) return;
        daysSet.add(item.day);
      }
    });
    
    return Array.from(daysSet).sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  }, [division, classGroup, classSubgroup, classSubsubgroup]);

  // Reset filters when parent filter changes
  useEffect(() => {
    setClassGroup("All");
    setClassSubgroup("All");
    setClassSubsubgroup("All");
    setDay("All");
  }, [division]);

  useEffect(() => {
    setClassSubgroup("All");
    setClassSubsubgroup("All");
    setDay("All");
  }, [classGroup]);

  useEffect(() => {
    setClassSubsubgroup("All");
    setDay("All");
  }, [classSubgroup]);

  useEffect(() => {
    if (day !== "All" && !availableDays.includes(day)) {
      setDay("All");
    }
  }, [classSubsubgroup, availableDays]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = ALL_ITEMS.filter((i) => {
      // Handle division filtering for multi-division events
      if (division !== "All") {
        const itemDivisions = (i as any).divisions 
          ? (i as any).divisions.split(';').map((d: string) => d.trim())
          : [i.division];
        
        if (!itemDivisions.includes(division)) return false;
      }
      
      // Handle special category filters
      if (classGroup !== "All") {
        if (classGroup === "Events") {
          if (i.kind !== "Event") return false;
        } else if (classGroup === "Exhibitor Reminders") {
          if (i.kind !== "Reminder") return false;
        } else {
          if ((i as any).classGroup !== classGroup) return false;
        }
      }
      
      if (classSubgroup !== "All" && (i as any).classSubgroup !== classSubgroup) return false;
      if (classSubsubgroup !== "All" && (i as any).classSubsubgroup !== classSubsubgroup) return false;
      if (day !== "All" && i.day !== day) return false;
      if (!q) return true;
      const hay = `${i.title} ${i.classNumber ?? ""} ${(i as any).classGroup ?? ""} ${i.division ?? ""} ${i.location}`.toLowerCase();
      return hay.includes(q);
    });

    return items.sort((a, b) => {
      const dayA = DAY_ORDER[a.day] ?? 999;
      const dayB = DAY_ORDER[b.day] ?? 999;
      const dayDiff = dayA - dayB;
      if (dayDiff !== 0) return dayDiff;
      
      const parseTime = (timeStr?: string) => {
        if (!timeStr) return 9999;
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
      
      const timeA = parseTime(a.time);
      const timeB = parseTime(b.time);
      
      if (timeA !== timeB) return timeA - timeB;
      
      const locationDiff = a.location.localeCompare(b.location);
      if (locationDiff !== 0) return locationDiff;
      
      return (a.order ?? 9999) - (b.order ?? 9999);
    });
  }, [query, division, classGroup, classSubgroup, classSubsubgroup, day]);

  const showClassGroupFilter = availableClassGroups.length > 0;
  const showSubgroupFilter = availableSubgroups.length > 0;
  const showSubsubgroupFilter = availableSubsubgroups.length > 0;
  const showDayFilter = availableDays.length > 1;

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

      {showClassGroupFilter && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Category</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Chip label="All" active={classGroup === "All"} onPress={() => setClassGroup("All")} />
            {availableClassGroups.map((cg) => (
              <Chip key={cg} label={cg} active={classGroup === cg} onPress={() => setClassGroup(cg)} />
            ))}
          </View>
        </>
      )}

      {showSubgroupFilter && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Subcategory</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Chip label="All" active={classSubgroup === "All"} onPress={() => setClassSubgroup("All")} />
            {availableSubgroups.map((sg) => (
              <Chip key={sg} label={sg} active={classSubgroup === sg} onPress={() => setClassSubgroup(sg)} />
            ))}
          </View>
        </>
      )}

      {showSubsubgroupFilter && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Chip label="All" active={classSubsubgroup === "All"} onPress={() => setClassSubsubgroup("All")} />
            {availableSubsubgroups.map((ssg) => (
              <Chip key={ssg} label={ssg} active={classSubsubgroup === ssg} onPress={() => setClassSubsubgroup(ssg)} />
            ))}
          </View>
        </>
      )}

      {showDayFilter && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Day</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Chip label="All" active={day === "All"} onPress={() => setDay("All")} />
            {availableDays.map((d) => (
              <Chip key={d} label={d} active={day === d} onPress={() => setDay(d)} />
            ))}
          </View>
        </>
      )}

      <FlatList<FairItem>
        data={filtered}
        keyExtractor={(it) => it.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 100 }}
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
                {item.day} · {item.time || 'TBD'} · {item.location}
              </Text>
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
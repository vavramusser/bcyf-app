// app/(tabs)/myschedule.tsx

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { SectionList, Text, View } from "react-native";
import { divisionTint } from "../../lib/divisioncolors";
import { getFavorites } from "../../lib/favorites";
import { ALL_ITEMS } from "../../types";
import { DayName, DAYS, FairItem } from "../../types/event_types";

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

  // Refresh favorites whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getFavorites().then((set) => mounted && setFavIds(set));
      return () => { mounted = false; };
    }, [])
  );

  const sections: Section[] = useMemo(() => {
    const picked = ALL_ITEMS.filter((i) => favIds.has(i.id));

    picked.sort((a, b) => {
      const d = DAY_ORDER[a.day] - DAY_ORDER[b.day];
      if (d !== 0) return d;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (!!a.time !== !!b.time) return a.time ? -1 : 1;
      const r = a.location.localeCompare(b.location);
      if (r !== 0) return r;
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

  return (
    <View style={{ flex: 1, paddingTop: 48, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>My Schedule</Text>

      <SectionList<FairItem>
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const bg = divisionTint(item.division, 0.12);

          return (
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
                {labelFor(item)}
              </Text>
              <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {(item.division ?? "")}
                {(item.classType || item.eventType) ? " • " : ""}
                {(item.classType ?? item.eventType ?? "")}
              </Text>
            </View>
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
    </View>
  );
}
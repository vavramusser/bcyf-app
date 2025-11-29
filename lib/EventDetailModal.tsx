// lib/EventDetailModal.tsx

import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { FairItem } from "../types/event_types";
import { divisionTint } from "./divisioncolors";

interface EventDetailModalProps {
  visible: boolean;
  event: FairItem | null;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  sessionInfo?: {
    sessionName?: string;
    totalClasses?: number;
    sessionStartTime?: string;
  };
}

export function EventDetailModal({ 
  visible, 
  event, 
  isSaved, 
  onClose, 
  onToggleSave,
  sessionInfo 
}: EventDetailModalProps) {
  if (!event) return null;

  const bg = divisionTint(event.division, 0.12);
  const isEstimatedTime = event.time?.startsWith('~');

  // Combine division and type
  const divisionText = [event.division, event.classType].filter(Boolean).join(' · ');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Event Details</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={{ padding: 16 }}>
            <View style={{
              backgroundColor: bg,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              {event.classNumber && (
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                  Class #{event.classNumber}
                </Text>
              )}
              
              <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
                {event.title}
              </Text>

              <View style={{ marginTop: 8 }}>
                <DetailRow label="Day" value={event.day} />
                <DetailRow 
                  label={isEstimatedTime ? "Est. Start Time" : "Start Time"} 
                  value={event.time || 'TBD'} 
                />
                <DetailRow label="Location" value={event.location} />
                {divisionText && (
                <DetailRow 
                    label="Division" 
                    value={divisionText} 
                    isLast={!(event.order && sessionInfo)}
                />
                )}
                
                {/* Session Info - no header, just the text */}
                {event.order && sessionInfo && (
                  <View style={{
                    paddingTop: 12,
                    marginTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(0,0,0,0.1)',
                  }}>
                    <Text style={{ fontSize: 13, color: '#000', lineHeight: 18 }}>
                      {sessionInfo.sessionName || 'Class session'}
                      {'\n'}
                      Class {event.order} of {sessionInfo.totalClasses || '?'}
                      {sessionInfo.sessionStartTime && ` (classes start at ${sessionInfo.sessionStartTime})`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Save/Unsave Button */}
            <Pressable
              onPress={onToggleSave}
              style={{
                backgroundColor: isSaved ? '#ef4444' : '#10b981',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                {isSaved ? '★ Remove from My Schedule' : '☆ Add to My Schedule'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row',
      paddingVertical: 6,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
    }}>
      <Text style={{ fontSize: 14, fontWeight: '600', width: 100, color: '#666' }}>
        {label}:
      </Text>
      <Text style={{ fontSize: 14, flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}
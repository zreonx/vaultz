import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { StackHeader } from "@/components/shared/StackHeader";
import { quickNotesApi } from "@/api/quickNotes";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { QuickNoteResponse } from "@/types/api";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

const NOTE_PALETTE = [
  "#2A6B58",
  "#3B82F6",
  "#D97706",
  "#8B5CF6",
  "#0EA5E9",
  "#E06C6C",
  "#10B981",
  "#EC4899",
];

function formatDateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export const QuickNotesScreen: React.FC = () => {
  const { activeWorkspace } = useWorkspace();
  const { colors } = useTheme();

  const [notes, setNotes] = useState<QuickNoteResponse[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create / Edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<QuickNoteResponse | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [colorHex, setColorHex] = useState(NOTE_PALETTE[0]);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [scopeToAccount, setScopeToAccount] = useState(
    Boolean(activeWorkspace)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadNotes = useCallback(async () => {
    try {
      const data = await quickNotesApi.getNotes(
        activeWorkspace?.id,
        includeArchived,
        debouncedSearch || undefined
      );
      setNotes(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load quick notes.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWorkspace?.id, includeArchived, debouncedSearch]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadNotes();
    }, [loadNotes])
  );

  const pinnedNotes = useMemo(
    () => notes.filter((n) => n.isPinned && !n.isArchived),
    [notes]
  );
  const otherNotes = useMemo(
    () => notes.filter((n) => !n.isPinned || n.isArchived),
    [notes]
  );

  const openCreateModal = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setColorHex(NOTE_PALETTE[0]);
    setIsPinned(false);
    setIsArchived(false);
    setScopeToAccount(Boolean(activeWorkspace));
    setModalVisible(true);
  };

  const openEditModal = (note: QuickNoteResponse) => {
    haptics.light();
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColorHex(note.colorHex || NOTE_PALETTE[0]);
    setIsPinned(note.isPinned);
    setIsArchived(note.isArchived);
    setScopeToAccount(Boolean(note.accountId));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your note.");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Empty Content", "Please write something in your note.");
      return;
    }

    const accountId =
      scopeToAccount && activeWorkspace
        ? activeWorkspace.id
        : scopeToAccount && editingNote?.accountId
        ? editingNote.accountId
        : null;

    setIsSubmitting(true);
    try {
      if (editingNote) {
        await quickNotesApi.updateNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          colorHex,
          isPinned,
          isArchived,
          accountId,
        });
      } else {
        await quickNotesApi.createNote({
          title: title.trim(),
          content: content.trim(),
          colorHex,
          isPinned,
          accountId,
        });
      }
      haptics.success();
      setModalVisible(false);
      await loadNotes();
    } catch (err: any) {
      Alert.alert("Save Failed", err?.message || "Unable to save note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (note: QuickNoteResponse) => {
    haptics.light();
    try {
      await quickNotesApi.togglePin(note.id);
      await loadNotes();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not toggle pin.");
    }
  };

  const confirmDelete = (note: QuickNoteResponse) => {
    Alert.alert("Delete Note", `Delete "${note.title}" permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await quickNotesApi.deleteNote(note.id);
            haptics.success();
            await loadNotes();
          } catch (err: any) {
            Alert.alert("Delete Failed", err?.message || "Unable to delete note.");
          }
        },
      },
    ]);
  };

  const renderNoteCard = (note: QuickNoteResponse) => (
    <Card
      key={note.id}
      onPress={() => openEditModal(note)}
      style={styles.noteCard}
    >
      <View
        style={[
          styles.colorBar,
          { backgroundColor: note.colorHex || colors.accent },
        ]}
      />
      <View style={styles.noteInner}>
        <View style={styles.noteHeader}>
          <Text
            style={[styles.noteTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {note.title}
          </Text>
          <View style={styles.noteActions}>
            <TouchableOpacity
              onPress={() => handleTogglePin(note)}
              style={styles.noteIconBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={note.isPinned ? "Unpin note" : "Pin note"}
            >
              <Ionicons
                name={note.isPinned ? "bookmark" : "bookmark-outline"}
                size={18}
                color={note.isPinned ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDelete(note)}
              style={styles.noteIconBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={`Delete ${note.title}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={[styles.noteBody, { color: colors.textSecondary }]}
          numberOfLines={4}
        >
          {note.content}
        </Text>

        <View style={styles.noteFooter}>
          <View style={styles.noteBadges}>
            <Badge label={note.accountName || "General"} variant="outline" />
            {note.isArchived ? (
              <Badge label="Archived" variant="warning" />
            ) : null}
          </View>
          <Text style={[styles.noteDate, { color: colors.textMuted }]}>
            {formatDateLabel(note.updatedAtUtc || note.createdAtUtc)}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <ScreenWrapper>
      <StackHeader
        title="Quick Notes"
        subtitle={activeWorkspace ? activeWorkspace.name : "All Accounts"}
        showPrivacyToggle={false}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              openCreateModal();
            }}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel="Add quick note"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={20} color={colors.accentForeground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadNotes();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.container}>
          <Input
            placeholder="Search notes..."
            leftIcon="search-outline"
            value={searchInput}
            onChangeText={setSearchInput}
          />

          <View style={styles.archiveToggleRow}>
            <Text style={[styles.archiveLabel, { color: colors.textSecondary }]}>
              Show Archived Notes
            </Text>
            <Switch
              value={includeArchived}
              onValueChange={setIncludeArchived}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          {isLoading && notes.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : notes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons
                  name="document-text-outline"
                  size={26}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Quick Notes
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Keep bill payment references, tax reminders, and short checklists synced across devices.
              </Text>
              <Button
                title="Write First Note"
                onPress={openCreateModal}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          ) : (
            <>
              {pinnedNotes.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>
                    PINNED
                  </Text>
                  {pinnedNotes.map(renderNoteCard)}
                </View>
              ) : null}

              {otherNotes.length > 0 ? (
                <View style={styles.sectionBlock}>
                  {pinnedNotes.length > 0 ? (
                    <Text
                      style={[styles.sectionKicker, { color: colors.textMuted }]}
                    >
                      NOTES
                    </Text>
                  ) : null}
                  {otherNotes.map(renderNoteCard)}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {/* Create / Edit Modal */}
      <ModalSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingNote ? "Edit Note" : "New Quick Note"}
        subtitle="Keep reminders & checklists handy"
        maxHeightRatio={0.9}
        footer={
          <Button
            title={editingNote ? "Save Changes" : "Create Note"}
            onPress={handleSave}
            isLoading={isSubmitting}
          />
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Title"
            placeholder="e.g., Utility Bill Ref #, Savings Idea"
            value={title}
            onChangeText={setTitle}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Note Content"
            placeholder="Write your note here..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            style={{ minHeight: 105, textAlignVertical: "top" }}
            containerStyle={{ marginBottom: 0 }}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Color Tag
            </Text>
            <View style={styles.paletteRow}>
              {NOTE_PALETTE.map((hex) => {
                const selected = colorHex.toUpperCase() === hex.toUpperCase();
                return (
                  <TouchableOpacity
                    key={hex}
                    onPress={() => {
                      haptics.light();
                      setColorHex(hex);
                    }}
                    style={[
                      styles.paletteDot,
                      { backgroundColor: hex },
                      selected && {
                        borderWidth: 3,
                        borderColor: colors.textPrimary,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.switchRow,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                Pin to Top
              </Text>
              <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                Keep highlighted at the top of your notes
              </Text>
            </View>
            <Switch
              value={isPinned}
              onValueChange={setIsPinned}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          {activeWorkspace ? (
            <View
              style={[
                styles.switchRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                  Only for {activeWorkspace.name}
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Turn off for general cross-account notes
                </Text>
              </View>
              <Switch
                value={scopeToAccount}
                onValueChange={setScopeToAccount}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          ) : null}

          {editingNote ? (
            <View
              style={[
                styles.switchRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                  Archive Note
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Hide from active notes without deleting
                </Text>
              </View>
              <Switch
                value={isArchived}
                onValueChange={setIsArchived}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          ) : null}
        </View>
      </ModalSheet>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  archiveToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  archiveLabel: {
    ...typography.label,
  },
  centerBox: {
    paddingVertical: spacing.huge,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    ...typography.title,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  sectionBlock: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionKicker: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginLeft: spacing.xs,
  },
  noteCard: {
    padding: 0,
    overflow: "hidden",
  },
  colorBar: {
    height: 4,
    width: "100%",
  },
  noteInner: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  noteTitle: {
    ...typography.bodyLarge,
    fontWeight: "700",
    flex: 1,
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  noteIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  noteBody: {
    ...typography.body,
    fontSize: 13.5,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  noteBadges: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  noteDate: {
    ...typography.caption,
  },
  modalBody: {
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  paletteDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  switchLabel: {
    ...typography.label,
  },
  switchSub: {
    ...typography.caption,
    marginTop: 2,
  },
});

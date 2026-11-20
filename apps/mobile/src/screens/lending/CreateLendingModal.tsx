import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { lendingApi } from "@/api/lending";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { typography, radius, spacing } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

interface CreateLendingModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: "Lent" | "Borrowed";
  onSuccess?: () => void;
}

export const CreateLendingModal: React.FC<CreateLendingModalProps> = ({
  visible,
  onClose,
  defaultType = "Lent",
  onSuccess,
}) => {
  const { activeWorkspace, refetchAll } = useWorkspace();
  const { colors, isDark } = useTheme();
  const [type, setType] = useState<"Lent" | "Borrowed">(defaultType);
  const [contactName, setContactName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [syncAccountBalance, setSyncAccountBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setType(defaultType);
      setContactName("");
      setAmount("");
      setNotes("");
      setSyncAccountBalance(true);
      setError(null);
    }
  }, [visible, defaultType]);

  const handleSubmit = async () => {
    if (!activeWorkspace) {
      setError("Please create or select an account first");
      haptics.error();
      return;
    }

    if (!contactName.trim()) {
      setError("Contact / Person name is required");
      haptics.error();
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await lendingApi.create({
        accountId: activeWorkspace.id,
        borrowerOrLenderName: contactName.trim(),
        type,
        totalAmount: parsedAmount,
        currency:
          activeWorkspace.currency || activeWorkspace.currencyCode || "USD",
        notes: notes.trim() || undefined,
        dueDate: undefined,
        syncAccountBalance,
      });

      haptics.success();
      await refetchAll();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || "Failed to record loan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Record Loan / IOU"
      subtitle="Track money lent to or borrowed from others"
      maxHeightRatio={0.88}
      footer={
        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={isLoading}
          />
          <Button
            title="Save Loan"
            variant="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
        </View>
      }
    >
      <View style={styles.container}>
        {error && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
              },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark
                ? colors.surfaceSubtle
                : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <PressableScale
            style={[
              styles.segmentBtn,
              type === "Lent" && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ],
            ]}
            onPress={() => {
              haptics.selection();
              setType("Lent");
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.segmentText,
                {
                  color: type === "Lent" ? colors.accent : colors.textMuted,
                  fontWeight: type === "Lent" ? "700" : "500",
                },
              ]}
            >
              I Lent (Owed to me)
            </Text>
          </PressableScale>

          <PressableScale
            style={[
              styles.segmentBtn,
              type === "Borrowed" && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ],
            ]}
            onPress={() => {
              haptics.selection();
              setType("Borrowed");
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.segmentText,
                {
                  color: type === "Borrowed" ? colors.warning : colors.textMuted,
                  fontWeight: type === "Borrowed" ? "700" : "500",
                },
              ]}
            >
              I Borrowed (I owe)
            </Text>
          </PressableScale>
        </View>

        <Input
          label={
            type === "Lent"
              ? "Debtor / Borrower Name"
              : "Creditor / Lender Name"
          }
          placeholder="e.g. Alex Rivera, Mom, Dave"
          value={contactName}
          onChangeText={(val) => {
            setContactName(val);
            if (error) setError(null);
          }}
          leftIcon="person-outline"
          autoFocus
        />

        <Input
          label="Total Amount"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          currencyCode={
            activeWorkspace?.currency || activeWorkspace?.currencyCode || "USD"
          }
        />

        <Input
          label="Notes / Description (Optional)"
          placeholder="e.g. Concert tickets, Split lunch"
          value={notes}
          onChangeText={setNotes}
          leftIcon="reader-outline"
          multiline
          numberOfLines={2}
        />

        <View
          style={[
            styles.syncSwitchRow,
            {
              backgroundColor: isDark
                ? colors.surfaceSubtle
                : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.syncSwitchTextCol}>
            <Text style={[styles.syncSwitchTitle, { color: colors.textPrimary }]}>
              Sync with Account Balance
            </Text>
            <Text style={[styles.syncSwitchSub, { color: colors.textMuted }]}>
              {type === "Lent"
                ? "Deduct this outflow from your active balance"
                : "Add this inflow to your active balance"}
            </Text>
          </View>
          <Switch
            value={syncAccountBalance}
            onValueChange={(v) => {
              haptics.selection();
              setSyncAccountBalance(v);
            }}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={syncAccountBalance ? colors.accent : colors.surface}
          />
        </View>
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    textAlign: "center",
    fontWeight: "500",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.base,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentText: {
    ...typography.caption,
    fontSize: 12,
  },
  syncSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  syncSwitchTextCol: {
    flex: 1,
  },
  syncSwitchTitle: {
    ...typography.label,
    fontSize: 13,
  },
  syncSwitchSub: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});

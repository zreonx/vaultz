import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { lendingApi } from "@/api/lending";
import { typography, radius, spacing } from "@/theme/tokens";
import { formatMoney } from "@/utils/currency";
import { haptics } from "@/utils/haptics";
import { LendingItemDto, LendingType } from "@/types/api";

interface LogRepaymentModalProps {
  visible: boolean;
  item: LendingItemDto | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LogRepaymentModal: React.FC<LogRepaymentModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const { refetchAll } = useWorkspace();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [syncAccountBalance, setSyncAccountBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setNotes("");
      setSyncAccountBalance(true);
      setError(null);
    }
  }, [visible, item?.id]);

  if (!item) return null;

  const remainingBalance = item.remainingBalance ?? item.remainingAmount ?? 0;
  const curr = item.currency || item.currencyCode;
  const isLent = item.type === LendingType.Lent || item.typeName === "Lent";
  const contactName = item.borrowerOrLenderName || item.counterparty;

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive repayment amount");
      haptics.error();
      return;
    }

    if (parsedAmount > remainingBalance) {
      setError(
        `Amount cannot exceed remaining balance (${formatMoney(remainingBalance, curr)})`
      );
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await lendingApi.logRepayment(item.id, {
        amount: parsedAmount,
        repaymentDate: new Date().toISOString(),
        notes: notes.trim() || undefined,
        syncAccountBalance,
      });

      haptics.success();
      await refetchAll();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || "Failed to record repayment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Record Repayment"
      subtitle={`${isLent ? "Repayment received from" : "Payment made to"} ${contactName}`}
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
            title="Record Repayment"
            variant="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
        </View>
      }
    >
      <View style={styles.container}>
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark
                ? colors.surfaceSubtle
                : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            OUTSTANDING BALANCE
          </Text>
          <Text
            style={[
              styles.infoValue,
              { color: isLent ? colors.accent : colors.warning },
            ]}
          >
            {formatMoney(remainingBalance, curr)}
          </Text>
        </View>

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

        <Input
          label="Repayment Amount"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          currencyCode={curr}
          autoFocus
        />

        {remainingBalance > 0 && (
          <View style={styles.quickChipRow}>
            <PressableScale
              onPress={() => {
                haptics.selection();
                setAmount(String(remainingBalance));
                if (error) setError(null);
              }}
              style={[
                styles.quickChip,
                {
                  backgroundColor: isDark
                    ? colors.surfaceSubtle
                    : colors.surfaceMuted,
                },
              ]}
            >
              <Text style={[styles.quickChipText, { color: colors.accent }]}>
                Fill Full Balance ({formatMoney(remainingBalance, curr)})
              </Text>
            </PressableScale>
          </View>
        )}

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Bank transfer, Cash in hand"
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
              {isLent
                ? "Credit this repayment to your active balance"
                : "Deduct this payment from your active balance"}
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
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  infoLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.title,
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
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
  quickChipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -6,
    marginBottom: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  syncSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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

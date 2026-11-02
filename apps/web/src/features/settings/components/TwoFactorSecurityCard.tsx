"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  useConfirmTwoFactorMutation,
  useDisableTwoFactorMutation,
  useSetupTwoFactorMutation,
} from "@/hooks/use-auth";
import type { TwoFactorSetupResponse, UserProfileResponse } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TwoFactorSecurityCardProps {
  user: UserProfileResponse | null;
}

export function TwoFactorSecurityCard({ user }: TwoFactorSecurityCardProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const setupMutation = useSetupTwoFactorMutation();
  const confirmMutation = useConfirmTwoFactorMutation();
  const disableMutation = useDisableTwoFactorMutation();

  const isEnabled = user?.twoFactorEnabled ?? false;

  const handleStartSetup = () => {
    setFeedbackMessage(null);
    setupMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data);
        setVerificationCode("");
        setSetupOpen(true);
      },
    });
  };

  const handleCopyKey = () => {
    if (!setupData?.secretKey) return;
    navigator.clipboard.writeText(setupData.secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCodes = () => {
    if (!setupData?.recoveryCodes) return;
    navigator.clipboard.writeText(setupData.recoveryCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleConfirmSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || verificationCode.trim().length !== 6) return;

    confirmMutation.mutate(
      {
        secretKey: setupData.secretKey,
        code: verificationCode.trim(),
        recoveryCodes: setupData.recoveryCodes,
      },
      {
        onSuccess: () => {
          setSetupOpen(false);
          setSetupData(null);
          setFeedbackMessage("Two-factor authentication has been successfully enabled.");
        },
      }
    );
  };

  const handleConfirmDisable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    disableMutation.mutate(
      { password: disablePassword },
      {
        onSuccess: () => {
          setDisableOpen(false);
          setDisablePassword("");
          setFeedbackMessage("Two-factor authentication has been disabled.");
        },
      }
    );
  };

  return (
    <>
      <Card className="border-[var(--border-subtle)] bg-[var(--surface)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                Two-Factor Authentication (2FA)
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your financial data using standard TOTP authenticator apps.
              </CardDescription>
            </div>
            <Badge variant={isEnabled ? "default" : "neutral"}>
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {feedbackMessage && (
            <Alert variant="default" className="border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-xs">{feedbackMessage}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Verification Method</span>
              <span className="font-medium inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-[var(--accent)]" />
                {isEnabled ? "Authenticator App (TOTP)" : "None configured"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Supported Apps</span>
              <span className="text-[var(--foreground)]">Google Authenticator, 1Password, Authy</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted-foreground)]">Emergency Backup</span>
              <span className="text-[var(--foreground)]">
                {isEnabled ? "Recovery Codes Available" : "Generates with setup"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[var(--muted-foreground)]">
              {isEnabled
                ? "Every sign-in requires your password and a code from your mobile authenticator."
                : "Strongly recommended: Protect against password theft or unauthorized account access."}
            </p>

            {isEnabled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[var(--danger)] hover:text-[var(--danger)]"
                onClick={() => setDisableOpen(true)}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleStartSetup}
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? "Generating Key…" : "Set Up Authenticator"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SETUP DIALOG */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[var(--accent)]" />
              Set Up Authenticator App
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              Follow these steps to link your preferred mobile authenticator app.
            </DialogDescription>
          </DialogHeader>

          {confirmMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Verification Failed</AlertTitle>
              <AlertDescription className="text-xs">
                {confirmMutation.error instanceof Error
                  ? confirmMutation.error.message
                  : "Invalid code. Please ensure the time on your phone is correct."}
              </AlertDescription>
            </Alert>
          )}

          {setupData && (
            <form onSubmit={handleConfirmSetup} className="space-y-4">
              {/* Step 1: Secret Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">1. Secret Key for Manual Entry</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={setupData.secretKey}
                    className="font-mono text-xs h-9 bg-[var(--surface-muted)]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyKey}
                    className="h-9 px-2.5 text-xs"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Add an account in Google Authenticator or 1Password and paste this secret key.
                </p>
              </div>

              {/* Step 2: Emergency Recovery Codes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">2. Emergency Recovery Codes</Label>
                  <button
                    type="button"
                    onClick={handleCopyCodes}
                    className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                  >
                    {copiedCodes ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedCodes ? "Copied" : "Copy All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/70 p-2 text-center font-mono text-[11px]">
                  {setupData.recoveryCodes.map((code) => (
                    <span key={code} className="rounded bg-[var(--surface)] py-1 border border-[var(--border-subtle)]">
                      {code}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Save these codes in a secure place. Each can be used once if you lose your phone.
                </p>
              </div>

              {/* Step 3: Confirm Code */}
              <div className="space-y-1.5">
                <Label htmlFor="setup-verification-code" className="text-xs font-medium">
                  3. Enter 6-Digit Code from App
                </Label>
                <Input
                  id="setup-verification-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="123456"
                  className="h-10 text-center font-mono text-lg tracking-widest"
                  required
                  autoFocus
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSetupOpen(false)}
                  disabled={confirmMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={confirmMutation.isPending || verificationCode.length !== 6}
                >
                  {confirmMutation.isPending ? "Activating…" : "Activate Two-Factor"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DISABLE DIALOG */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--danger)]">
              <ShieldAlert className="h-4 w-4" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted-foreground)]">
              Are you sure? Disabling two-factor authentication leaves your financial account protected by password only.
            </DialogDescription>
          </DialogHeader>

          {disableMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Could not disable 2FA</AlertTitle>
              <AlertDescription className="text-xs">
                {disableMutation.error instanceof Error
                  ? disableMutation.error.message
                  : "Invalid password provided."}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleConfirmDisable} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="disable-password" className="text-xs font-medium">
                Confirm Your Current Password
              </Label>
              <div className="relative">
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="h-10 text-sm pl-9"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisableOpen(false)}
                disabled={disableMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                className="border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)]/10"
                disabled={disableMutation.isPending || !disablePassword}
              >
                {disableMutation.isPending ? "Disabling…" : "Confirm Disable"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

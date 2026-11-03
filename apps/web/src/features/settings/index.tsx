"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  User,
  Wallet,
} from "lucide-react";
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCES_KEY,
  getStoredNotificationPreferences,
} from "@/hooks/use-notifications";
import { TwoFactorSecurityCard } from "./components/TwoFactorSecurityCard";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useTutorial } from "@/context/tutorial-context";
import {
  useChangePasswordMutation,
  useCurrentUser,
  useLogoutMutation,
  useUpdateProfileMutation,
} from "@/hooks/use-auth";
import {
  useExchangeRates,
  useRefreshExchangeRatesMutation,
} from "@/hooks/use-exchange-rates";
import {
  useAccounts,
  useSetDefaultAccountMutation,
} from "@/features/accounts";
import {
  CURRENCY_METADATA,
  SUPPORTED_CURRENCIES,
  formatMoney,
  getReferenceExchangeRate,
} from "@/lib/utils/currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SecurityPreferences {
  confirmBeforeDelete: boolean;
  privacyMaskInSharedView: boolean;
  budgetWarningAlerts: boolean;
  upcomingBillReminders: boolean;
}

const DEFAULT_PREFERENCES: SecurityPreferences = {
  confirmBeforeDelete: true,
  privacyMaskInSharedView: false,
  budgetWarningAlerts: true,
  upcomingBillReminders: true,
};

const PREFERENCES_STORAGE_KEY = "vaultz.security_preferences";

export function SettingsFeature() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetTour } = useTutorial();
  const initialTab =
    searchParams.get("tab") === "security"
      ? "security"
      : searchParams.get("tab") === "privacy"
        ? "privacy"
        : searchParams.get("tab") === "notifications"
          ? "notifications"
          : "profile";

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "security" ||
      tabParam === "privacy" ||
      tabParam === "profile" ||
      tabParam === "notifications"
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Notification Preferences state
  const [notifPreferences, setNotifPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notifSaved, setNotifSaved] = useState<boolean>(false);

  useEffect(() => {
    setNotifPreferences(getStoredNotificationPreferences());
  }, []);

  const updateNotifPreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setNotifPreferences((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(
          NOTIFICATION_PREFERENCES_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Storage failover
      }
      return next;
    });
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const { data: user } = useCurrentUser();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const logoutMutation = useLogoutMutation();
  const { data: fxRates } = useExchangeRates();
  const refreshRatesMutation = useRefreshExchangeRatesMutation();

  // Default Account state
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();
  const setDefaultAccountMutation = useSetDefaultAccountMutation();
  const currentDefaultAccount =
    accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;
  const [selectedDefaultId, setSelectedDefaultId] = useState<string>("");
  const [defaultSavedMessage, setDefaultSavedMessage] = useState<string | null>(
    null
  );
  const [defaultErrorMessage, setDefaultErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (currentDefaultAccount && !selectedDefaultId) {
      setSelectedDefaultId(currentDefaultAccount.id);
    }
  }, [currentDefaultAccount, selectedDefaultId]);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState("USD");
  const [profileSavedMessage, setProfileSavedMessage] = useState<string | null>(
    null
  );
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setDefaultCurrencyCode(user.defaultCurrencyCode || "USD");
    }
  }, [user]);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSavedMessage, setPasswordSavedMessage] = useState<
    string | null
  >(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<
    string | null
  >(null);

  // Security & Privacy preferences state
  const [preferences, setPreferences] =
    useState<SecurityPreferences>(DEFAULT_PREFERENCES);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SecurityPreferences>;
        setPreferences({
          confirmBeforeDelete:
            parsed.confirmBeforeDelete ?? DEFAULT_PREFERENCES.confirmBeforeDelete,
          privacyMaskInSharedView:
            parsed.privacyMaskInSharedView ??
            DEFAULT_PREFERENCES.privacyMaskInSharedView,
          budgetWarningAlerts:
            parsed.budgetWarningAlerts ?? DEFAULT_PREFERENCES.budgetWarningAlerts,
          upcomingBillReminders:
            parsed.upcomingBillReminders ??
            DEFAULT_PREFERENCES.upcomingBillReminders,
        });
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const updatePreference = <K extends keyof SecurityPreferences>(
    key: K,
    value: SecurityPreferences[K]
  ) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(
          PREFERENCES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
    setPreferencesSaved(true);
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "VZ";

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  const handleSaveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSavedMessage(null);
    setProfileErrorMessage(null);

    if (!fullName.trim()) {
      setProfileErrorMessage("Please enter your full name.");
      return;
    }

    updateProfileMutation.mutate(
      {
        fullName: fullName.trim(),
        defaultCurrencyCode,
      },
      {
        onSuccess: () => {
          setProfileSavedMessage(
            "Your profile and display currency have been updated."
          );
        },
        onError: (err) => {
          setProfileErrorMessage(
            err instanceof Error
              ? err.message
              : "Could not update your profile. Please check your details."
          );
        },
      }
    );
  };

  const handleChangePassword = (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordSavedMessage(null);
    setPasswordErrorMessage(null);

    if (!currentPassword) {
      setPasswordErrorMessage("Please enter your current password.");
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setPasswordErrorMessage(
        "Your new password must be at least 8 characters and include at least one letter and one number."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage(
        "Your new password and confirmation password do not match."
      );
      return;
    }

    changePasswordMutation.mutate(
      {
        currentPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordSavedMessage(
            "Your password has been updated and your active session has been refreshed."
          );
        },
        onError: (err) => {
          setPasswordErrorMessage(
            err instanceof Error
              ? err.message
              : "Could not change your password. Please verify your current password."
          );
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="default">Account &amp; Security</Badge>
            <span className="text-xs text-[var(--muted-foreground)]">
              Personal profile, display currency, and sign-in protection
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Settings &amp; Profile
          </h2>
          <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">
            Manage your personal details, choose your preferred display currency
            (including South Korean Won ₩), update your password, and customize
            your privacy preferences.
          </p>
        </div>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Profile &amp; Currency
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Password &amp; Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Privacy &amp; Safety
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFILE & CURRENCY */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Profile & Default Account Forms */}
            <div className="space-y-6 lg:col-span-7">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Profile</CardTitle>
                      <CardDescription>
                        Update your name, email address, and default display
                        currency.
                      </CardDescription>
                    </div>
                    <Avatar className="h-12 w-12 rounded-2xl">
                      <AvatarFallback className="rounded-2xl bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="settings-fullname">Full Name</Label>
                      <div className="relative">
                        <Input
                          id="settings-fullname"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Morgan"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="settings-email">Email Address</Label>
                        <div className="flex items-center gap-1.5">
                          {user?.isEmailVerified ? (
                            <Badge variant="default" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                              Verified
                            </Badge>
                          ) : (
                            <Link
                              href={`/verify-email?email=${encodeURIComponent(user?.email ?? "")}`}
                              className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                            >
                              <ShieldAlert className="h-3 w-3" />
                              Verify Now
                            </Link>
                          )}
                          <Badge variant="neutral" className="text-[10px]">
                            <Lock className="h-2.5 w-2.5 mr-1" />
                            Immutable
                          </Badge>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          id="settings-email"
                          type="email"
                          value={email}
                          disabled
                          readOnly
                          className="bg-[var(--surface-muted)] text-[var(--muted-foreground)] cursor-not-allowed pl-9"
                        />
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        Your email address is permanently locked to your account for identity and security protection.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="settings-currency">
                        Preferred Display Currency
                      </Label>
                      <SearchableCurrencySelect
                        id="settings-currency"
                        value={defaultCurrencyCode}
                        onValueChange={setDefaultCurrencyCode}
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Your total net worth and monthly overview are converted into
                        this currency using live market exchange rates. Individual
                        accounts keep their own currency.
                      </p>
                    </div>

                    {profileSavedMessage && (
                      <Alert variant="default">
                        <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                        <AlertTitle>Changes saved</AlertTitle>
                        <AlertDescription>{profileSavedMessage}</AlertDescription>
                      </Alert>
                    )}

                    {profileErrorMessage && (
                      <Alert variant="destructive">
                        <AlertTitle>Could not update profile</AlertTitle>
                        <AlertDescription>{profileErrorMessage}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending
                          ? "Saving Changes..."
                          : "Save Profile"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Appearance & Theme Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-[var(--accent)]" />
                        Appearance &amp; Theme
                      </CardTitle>
                      <CardDescription>
                        Choose your interface theme: soft warm minimalist Light mode, deep graphite Dark mode, or match your system.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Color Theme Preference
                    </span>
                    <ThemeToggle variant="segmented" />
                  </div>
                </CardContent>
              </Card>

              {/* Default Account Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[var(--accent)]" />
                        Default Financial Account
                      </CardTitle>
                      <CardDescription>
                        Set the default account to load when you open Vaultz or start transactions.
                      </CardDescription>
                    </div>
                    {currentDefaultAccount && (
                      <Badge
                        variant="warning"
                        className="gap-1 text-xs font-medium"
                      >
                        <Star className="h-3 w-3 fill-current" />
                        {currentDefaultAccount.name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isLoadingAccounts ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      No accounts found. Create your first account in the{" "}
                      <Link
                        href="/accounts"
                        className="text-[var(--accent)] underline underline-offset-4"
                      >
                        Accounts
                      </Link>{" "}
                      tab.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="default-account-select">
                          Default Account
                        </Label>
                        <Select
                          value={selectedDefaultId || currentDefaultAccount?.id || ""}
                          onValueChange={(val) => {
                            setSelectedDefaultId(val);
                            setDefaultSavedMessage(null);
                            setDefaultErrorMessage(null);
                          }}
                        >
                          <SelectTrigger id="default-account-select" className="w-full">
                            <SelectValue placeholder="Select default account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <span>{acc.name}</span>
                                  <span className="text-xs text-[var(--muted-foreground)]">
                                    ({acc.currencyCode} • {acc.typeName})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          When you open Vaultz, this account will be automatically selected. Individual transactions can still be recorded on any account.
                        </p>
                      </div>

                      {defaultSavedMessage && (
                        <Alert variant="default">
                          <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                          <AlertTitle>Default Account Updated</AlertTitle>
                          <AlertDescription>{defaultSavedMessage}</AlertDescription>
                        </Alert>
                      )}

                      {defaultErrorMessage && (
                        <Alert variant="destructive">
                          <AlertTitle>Could not update default account</AlertTitle>
                          <AlertDescription>{defaultErrorMessage}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-xs text-[var(--muted-foreground)] hover:text-foreground"
                        >
                          <Link href="/accounts" className="flex items-center gap-1.5">
                            <span>Manage all accounts</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          disabled={
                            setDefaultAccountMutation.isPending ||
                            !selectedDefaultId ||
                            selectedDefaultId === currentDefaultAccount?.id
                          }
                          onClick={() => {
                            if (!selectedDefaultId) return;
                            setDefaultAccountMutation.mutate(selectedDefaultId, {
                              onSuccess: (acc) => {
                                setDefaultSavedMessage(
                                  `"${acc.name}" (${acc.currencyCode}) is now your default account.`
                                );
                                setDefaultErrorMessage(null);
                              },
                              onError: (err) => {
                                setDefaultErrorMessage(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to update default account."
                                );
                              },
                            });
                          }}
                        >
                          {setDefaultAccountMutation.isPending
                            ? "Saving Default…"
                            : selectedDefaultId === currentDefaultAccount?.id
                            ? "Current Default"
                            : "Set as Default Account"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Live Currency & Exchange Rate Overview */}
            <Card className="lg:col-span-5">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[var(--accent)]" />
                      Supported Currencies
                    </CardTitle>
                    <CardDescription>
                      Live conversion rates relative to 1 {defaultCurrencyCode}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refreshRatesMutation.mutate()}
                    disabled={refreshRatesMutation.isPending}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        refreshRatesMutation.isPending ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-3.5 py-2.5 text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Exchange Rate Status
                  </span>
                  <Badge
                    variant={fxRates?.isLiveFeedActive ? "default" : "neutral"}
                  >
                    {fxRates?.isLiveFeedActive
                      ? "Live Market Rates"
                      : "Standard Reference Rates"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_CURRENCIES.map((code) => {
                    const meta = CURRENCY_METADATA[code];
                    const rate = getReferenceExchangeRate(
                      defaultCurrencyCode,
                      code
                    );
                    const isSelected = code === defaultCurrencyCode;

                    return (
                      <div
                        key={code}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]/50 font-medium"
                            : "border-[var(--border-subtle)] bg-[var(--surface)]"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{code}</div>
                          <div className="text-[11px] text-[var(--muted-foreground)]">
                            {meta.name}
                          </div>
                        </div>
                        <span className="tabular-nums font-medium">
                          {formatMoney(rate, code)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: PASSWORD & SECURITY */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: 2FA + Change Password */}
            <div className="space-y-6 lg:col-span-7">
              <TwoFactorSecurityCard user={user ?? null} />

              {/* Change Password Card */}
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-[var(--accent)]" />
                      Change Password
                    </CardTitle>
                    <CardDescription>
                      Update your password regularly to keep your financial
                      account secure.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswords((prev) => !prev)}
                  >
                    {showPasswords ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="rounded-xl bg-[var(--surface-muted)] p-3.5">
                    <div className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                      Password Requirements
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={hasMinLength ? "default" : "neutral"}>
                        {hasMinLength ? "✓" : "•"} 8+ characters
                      </Badge>
                      <Badge variant={hasLetter ? "default" : "neutral"}>
                        {hasLetter ? "✓" : "•"} At least 1 letter
                      </Badge>
                      <Badge variant={hasNumber ? "default" : "neutral"}>
                        {hasNumber ? "✓" : "•"} At least 1 number
                      </Badge>
                      <Badge variant={passwordsMatch ? "default" : "neutral"}>
                        {passwordsMatch ? "✓" : "•"} Passwords match
                      </Badge>
                    </div>
                  </div>

                  {passwordSavedMessage && (
                    <Alert variant="default">
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                      <AlertTitle>Password updated</AlertTitle>
                      <AlertDescription>
                        {passwordSavedMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {passwordErrorMessage && (
                    <Alert variant="destructive">
                      <AlertTitle>Could not change password</AlertTitle>
                      <AlertDescription>
                        {passwordErrorMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending
                        ? "Updating Password..."
                        : "Update Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Account Security Status & Session Management */}
          <Card className="lg:col-span-5 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                Account Security Status
              </CardTitle>
              <CardDescription>
                Overview of your identity verification and sign-in protection
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/60 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Primary Email
                  </span>
                  <div className="flex items-center gap-2 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-[var(--accent)]" />
                      {user?.email ?? "—"}
                    </span>
                    <Badge variant={user?.isEmailVerified ? "default" : "neutral"} className="text-[10px]">
                      {user?.isEmailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Two-Factor Auth
                  </span>
                  <Badge variant={user?.twoFactorEnabled ? "default" : "neutral"} className="text-[10px]">
                    {user?.twoFactorEnabled ? "TOTP Active" : "Disabled"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Brute-Force Defense
                  </span>
                  <Badge variant="default" className="text-[10px]">5 Attempts / 15m Lock</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Sign-In &amp; Device Alerts
                  </span>
                  <Badge variant="default" className="text-[10px]">Email Dispatch Active</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">
                    Session Security
                  </span>
                  <Badge variant="default" className="text-[10px]">HttpOnly Cookie</Badge>
                </div>
              </div>

              <Alert variant="muted">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Continuous Threat Protection</AlertTitle>
                <AlertDescription>
                  Vaultz dispatches security alert emails whenever a sign-in from a new device or IP address is detected. Changing your password immediately invalidates all active sessions.
                </AlertDescription>
              </Alert>

              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-[var(--danger)] hover:text-[var(--danger)]"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out of This Device
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

        {/* TAB 3: NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which activities trigger instant live notifications and audio alerts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Budget Alerts */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notif-budget" className="text-sm font-medium">
                    Budget Spending Warnings
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Receive alerts when spending in any category reaches 85% or exceeds your monthly limit.
                  </p>
                </div>
                <Switch
                  id="pref-notif-budget"
                  checked={notifPreferences.budgetAlerts}
                  onCheckedChange={(checked) =>
                    updateNotifPreference("budgetAlerts", checked)
                  }
                />
              </div>

              {/* Savings Milestones */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notif-savings" className="text-sm font-medium">
                    Savings Goal Milestones
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Celebrate milestones and get notified when you reach 100% of your savings targets.
                  </p>
                </div>
                <Switch
                  id="pref-notif-savings"
                  checked={notifPreferences.savingsMilestones}
                  onCheckedChange={(checked) =>
                    updateNotifPreference("savingsMilestones", checked)
                  }
                />
              </div>

              {/* Account Transfers */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notif-transfers" className="text-sm font-medium">
                    Account-to-Account Transfers
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Receive confirmation when funds are moved between your accounts or across currencies.
                  </p>
                </div>
                <Switch
                  id="pref-notif-transfers"
                  checked={notifPreferences.transfers}
                  onCheckedChange={(checked) =>
                    updateNotifPreference("transfers", checked)
                  }
                />
              </div>

              {/* Lending & IOUs */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notif-lending" className="text-sm font-medium">
                    Lending &amp; IOU Reminders
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Get notified when personal loan repayments are logged or when a loan is fully settled.
                  </p>
                </div>
                <Switch
                  id="pref-notif-lending"
                  checked={notifPreferences.lendingReminders}
                  onCheckedChange={(checked) =>
                    updateNotifPreference("lendingReminders", checked)
                  }
                />
              </div>

              {/* Security Alerts */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notif-security" className="text-sm font-medium">
                    Security &amp; Account Protection
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    High-priority alerts for password updates, two-factor authentication changes, and new logins.
                  </p>
                </div>
                <Switch
                  id="pref-notif-security"
                  checked={notifPreferences.securityAlerts}
                  onCheckedChange={(checked) =>
                    updateNotifPreference("securityAlerts", checked)
                  }
                />
              </div>

              {/* Sound Chime */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pref-notif-sound" className="text-sm font-medium">
                    Audio Chime Tone
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Play a gentle dual-frequency chime when an alert is received while viewing the app.
                  </p>
                </div>
                <Switch
                  id="pref-notif-sound"
                  checked={notifPreferences.soundChime}
                  onCheckedChange={(checked) =>
                    updateNotifPreference("soundChime", checked)
                  }
                />
              </div>

              {notifSaved && (
                <Alert variant="default">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  <AlertTitle>Preferences saved</AlertTitle>
                  <AlertDescription>
                    Your notification alert settings have been updated and are active.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PRIVACY & SAFETY */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy &amp; Safety Preferences</CardTitle>
              <CardDescription>
                Customize how Vaultz protects your day-to-day actions and alerts
                you about your spending.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="pref-confirm-delete"
                    className="text-sm font-medium"
                  >
                    Confirm Before Deleting Records
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Always ask for confirmation before archiving or deleting
                    accounts, budgets, savings goals, or transactions.
                  </p>
                </div>
                <Switch
                  id="pref-confirm-delete"
                  checked={preferences.confirmBeforeDelete}
                  onCheckedChange={(checked) =>
                    updatePreference("confirmBeforeDelete", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="pref-budget-alerts"
                    className="text-sm font-medium"
                  >
                    Early Budget Spending Warnings
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Highlight monthly budget categories as soon as spending
                    reaches 85% of your planned limit.
                  </p>
                </div>
                <Switch
                  id="pref-budget-alerts"
                  checked={preferences.budgetWarningAlerts}
                  onCheckedChange={(checked) =>
                    updatePreference("budgetWarningAlerts", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="pref-recurring-reminders"
                    className="text-sm font-medium"
                  >
                    Upcoming Bill &amp; Subscription Reminders
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Show reminders for scheduled bills and recurring payments
                    before their due date.
                  </p>
                </div>
                <Switch
                  id="pref-recurring-reminders"
                  checked={preferences.upcomingBillReminders}
                  onCheckedChange={(checked) =>
                    updatePreference("upcomingBillReminders", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="pref-privacy-mask"
                    className="text-sm font-medium"
                  >
                    Screen-Sharing Privacy Mode
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Keep your screen ready for privacy when viewing your
                    finances in public spaces.
                  </p>
                </div>
                <Switch
                  id="pref-privacy-mask"
                  checked={preferences.privacyMaskInSharedView}
                  onCheckedChange={(checked) =>
                    updatePreference("privacyMaskInSharedView", checked)
                  }
                />
              </div>

              {preferencesSaved && (
                <Alert variant="default">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  <AlertTitle>Preferences saved</AlertTitle>
                  <AlertDescription>
                    Your privacy and safety settings have been saved to your
                    preferences.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Interactive Onboarding Tour Replay Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[var(--accent)]" />
                    Interactive Onboarding Tour
                  </CardTitle>
                  <CardDescription>
                    Walk through the core features of Vaultz with our step-by-step interactive guide.
                  </CardDescription>
                </div>
                <Badge variant="neutral" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                  Guided Tour
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                The onboarding tour walks you through creating your first isolated account, understanding workspace scoping, and recording transactions with live button highlights.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--muted-foreground)]">
                  Reset guide status and restart tour on the dashboard
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetTour();
                    router.push("/dashboard");
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Replay Onboarding Guide</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

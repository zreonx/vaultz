import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/context/ThemeContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { typography, radius, spacing } from '@/theme/tokens';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_METADATA,
  formatMoney,
  getReferenceExchangeRate,
  convertReferenceAmount,
} from '@/utils/currency';
import { haptics } from '@/utils/haptics';

type ToolTab = 'converter' | 'calculator' | 'loan' | 'savings';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
}

// Safe arithmetic expression parser
function evaluateExpression(expr: string): number {
  const sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!sanitized) return 0;
  let pos = 0;

  function peek(): string {
    return sanitized[pos] || '';
  }
  function get(): string {
    return sanitized[pos++] || '';
  }

  function parseExpression(): number {
    let result = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = get();
      const nextTerm = parseTerm();
      if (op === '+') result += nextTerm;
      else result -= nextTerm;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = get();
      const nextFactor = parseFactor();
      if (op === '*') result *= nextFactor;
      else if (op === '/') {
        if (nextFactor === 0) throw new Error('Divide by zero');
        result /= nextFactor;
      } else if (op === '%') {
        if (nextFactor === 0) throw new Error('Modulo by zero');
        result %= nextFactor;
      }
    }
    return result;
  }

  function parseFactor(): number {
    if (peek() === '+') {
      get();
      return parseFactor();
    }
    if (peek() === '-') {
      get();
      return -parseFactor();
    }
    if (peek() === '(') {
      get();
      const result = parseExpression();
      if (peek() === ')') get();
      return result;
    }

    let numStr = '';
    while ((peek() >= '0' && peek() <= '9') || peek() === '.') {
      numStr += get();
    }
    if (!numStr) throw new Error('Invalid expression');
    const val = parseFloat(numStr);
    if (Number.isNaN(val)) throw new Error('Invalid number');
    return val;
  }

  return parseExpression();
}

export const ToolsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { activeWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<ToolTab>('converter');

  // --- Currency Converter State ---
  const [amount, setAmount] = useState<string>('100');
  const [fromCurr, setFromCurr] = useState<string>(activeWorkspace?.currency || 'USD');
  const [toCurr, setToCurr] = useState<string>('EUR');

  const numericAmount = Math.max(0, parseFloat(amount) || 0);
  const convertedAmount = useMemo(
    () => convertReferenceAmount(numericAmount, fromCurr, toCurr),
    [numericAmount, fromCurr, toCurr]
  );
  const currentRate = useMemo(
    () => getReferenceExchangeRate(fromCurr, toCurr),
    [fromCurr, toCurr]
  );
  const invertedRate = useMemo(
    () => getReferenceExchangeRate(toCurr, fromCurr),
    [fromCurr, toCurr]
  );

  const handleSwapCurrencies = () => {
    haptics.selection();
    setFromCurr(toCurr);
    setToCurr(fromCurr);
  };

  // --- Standard Calculator State ---
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [calcExpr, setCalcExpr] = useState<string>('');
  const [calcHistory, setCalcHistory] = useState<HistoryItem[]>([]);
  const [justCalculated, setJustCalculated] = useState<boolean>(false);

  const handleCalcInput = (val: string) => {
    haptics.light();
    if (justCalculated) {
      if (/[0-9.]/.test(val)) {
        setCalcDisplay(val === '.' ? '0.' : val);
        setCalcExpr('');
      } else {
        setCalcExpr(calcDisplay + ' ' + val + ' ');
        setCalcDisplay('0');
      }
      setJustCalculated(false);
      return;
    }
    if (val === '.') {
      if (!calcDisplay.includes('.')) {
        setCalcDisplay((prev) => prev + '.');
      }
      return;
    }
    setCalcDisplay((prev) => (prev === '0' ? val : prev + val));
  };

  const handleCalcOperator = (op: string) => {
    haptics.selection();
    if (justCalculated) {
      setCalcExpr(calcDisplay + ' ' + op + ' ');
      setCalcDisplay('0');
      setJustCalculated(false);
      return;
    }
    if (calcExpr && calcDisplay === '0') {
      setCalcExpr((prev) => prev.trim().slice(0, -1) + op + ' ');
      return;
    }
    setCalcExpr((prev) => prev + calcDisplay + ' ' + op + ' ');
    setCalcDisplay('0');
  };

  const handleCalcClear = () => {
    haptics.medium();
    setCalcDisplay('0');
    setCalcExpr('');
    setJustCalculated(false);
  };

  const handleCalcBackspace = () => {
    haptics.light();
    if (justCalculated) {
      handleCalcClear();
      return;
    }
    setCalcDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const handleCalcNegate = () => {
    haptics.light();
    if (calcDisplay === '0') return;
    setCalcDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : '-' + prev));
  };

  const handleCalcPercentage = () => {
    haptics.light();
    const num = parseFloat(calcDisplay);
    if (!Number.isNaN(num)) {
      setCalcDisplay((num / 100).toString());
    }
  };

  const handleCalcEquals = () => {
    haptics.success();
    const full = (calcExpr + calcDisplay).trim();
    if (!full) return;
    try {
      const res = evaluateExpression(full);
      const formatted =
        Math.abs(res) < 1e-7 && res !== 0
          ? res.toExponential(4)
          : Number(res.toFixed(6)).toString();

      setCalcHistory((prev) => [
        {
          id: Math.random().toString(36).substring(2, 7),
          expression: full,
          result: formatted,
        },
        ...prev.slice(0, 9),
      ]);
      setCalcDisplay(formatted);
      setCalcExpr(full + ' =');
      setJustCalculated(true);
    } catch {
      setCalcDisplay('Error');
      setJustCalculated(true);
    }
  };

  // --- Loan Calculator State ---
  const [loanPrincipal, setLoanPrincipal] = useState<string>('5000');
  const [loanRate, setLoanRate] = useState<string>('5.0');
  const [loanMonths, setLoanMonths] = useState<string>('12');

  const loanPrincipalNum = Math.max(0, parseFloat(loanPrincipal) || 0);
  const loanRateNum = Math.max(0, parseFloat(loanRate) || 0);
  const loanMonthsNum = Math.max(1, parseInt(loanMonths, 10) || 1);

  const loanCalculation = useMemo(() => {
    const monthlyRate = loanRateNum / 100 / 12;
    if (loanPrincipalNum <= 0) {
      return { monthlyPayment: 0, totalInterest: 0, totalRepayment: 0 };
    }
    if (monthlyRate === 0) {
      return {
        monthlyPayment: loanPrincipalNum / loanMonthsNum,
        totalInterest: 0,
        totalRepayment: loanPrincipalNum,
      };
    }
    const factor = Math.pow(1 + monthlyRate, loanMonthsNum);
    const monthlyPayment = (loanPrincipalNum * (monthlyRate * factor)) / (factor - 1);
    const totalRepayment = monthlyPayment * loanMonthsNum;
    const totalInterest = Math.max(0, totalRepayment - loanPrincipalNum);
    return { monthlyPayment, totalInterest, totalRepayment };
  }, [loanPrincipalNum, loanRateNum, loanMonthsNum]);

  // --- Savings Projector State ---
  const [savingsInitial, setSavingsInitial] = useState<string>('1000');
  const [savingsMonthly, setSavingsMonthly] = useState<string>('200');
  const [savingsYears, setSavingsYears] = useState<string>('5');
  const [savingsRate, setSavingsRate] = useState<string>('7.0');

  const savInitialNum = Math.max(0, parseFloat(savingsInitial) || 0);
  const savMonthlyNum = Math.max(0, parseFloat(savingsMonthly) || 0);
  const savYearsNum = Math.max(1, parseInt(savingsYears, 10) || 1);
  const savRateNum = Math.max(0, parseFloat(savingsRate) || 0);

  const savingsCalculation = useMemo(() => {
    const monthlyRate = savRateNum / 100 / 12;
    const totalMonths = savYearsNum * 12;
    let balance = savInitialNum;
    let totalContributed = savInitialNum;

    for (let m = 1; m <= totalMonths; m++) {
      balance += balance * monthlyRate;
      balance += savMonthlyNum;
      totalContributed += savMonthlyNum;
    }

    const totalInterest = Math.max(0, balance - totalContributed);
    return {
      futureValue: balance,
      totalContributed,
      totalInterest,
    };
  }, [savInitialNum, savMonthlyNum, savYearsNum, savRateNum]);

  return (
    <ScreenWrapper>
      <Header showAccountPicker={false} title="Calculators & Tools" />

      {/* Segmented Tool Switcher */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        {(
          [
            { id: 'converter', label: 'Converter', icon: 'swap-horizontal-outline' },
            { id: 'calculator', label: 'Calculator', icon: 'calculator-outline' },
            { id: 'loan', label: 'Loan / IOU', icon: 'receipt-outline' },
            { id: 'savings', label: 'Savings', icon: 'trending-up-outline' },
          ] as const
        ).map((t) => {
          const isActive = activeTab === t.id;
          return (
            <PressableScale
              key={t.id}
              style={[
                styles.tabBtn,
                isActive && [
                  styles.tabBtnActive,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ],
              ]}
              onPress={() => {
                haptics.selection();
                setActiveTab(t.id);
              }}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={isActive ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.accent : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {t.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== TAB 1: CONVERTER ===================== */}
        {activeTab === 'converter' && (
          <View style={styles.tabContent}>
            <Card style={styles.card}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Live Currency Converter
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Instant cross-currency conversion with benchmark rates
              </Text>

              {/* Amount Input */}
              <Input
                label={`AMOUNT IN ${fromCurr}`}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                leftIcon="cash-outline"
                placeholder="100.00"
              />

              {/* From Currency Selector */}
              <View style={styles.currSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  FROM CURRENCY
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {SUPPORTED_CURRENCIES.map((c) => {
                    const isSelected = fromCurr === c;
                    return (
                      <PressableScale
                        key={c}
                        style={[
                          styles.currChip,
                          {
                            backgroundColor: isSelected
                              ? colors.accentSoft
                              : isDark
                              ? colors.surfaceSubtle
                              : colors.surfaceMuted,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => {
                          haptics.selection();
                          setFromCurr(c);
                        }}
                      >
                        <Text
                          style={[
                            styles.currChipText,
                            {
                              color: isSelected ? colors.accent : colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {c}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Centered Swap Divider */}
              <View style={styles.swapDividerRow}>
                <View style={[styles.swapDividerLine, { backgroundColor: colors.borderSubtle }]} />
                <TouchableOpacity
                  style={[
                    styles.swapCircleBtn,
                    {
                      backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  onPress={handleSwapCurrencies}
                >
                  <Ionicons name="swap-vertical" size={17} color={colors.accent} />
                </TouchableOpacity>
                <View style={[styles.swapDividerLine, { backgroundColor: colors.borderSubtle }]} />
              </View>

              {/* To Currency Selector */}
              <View style={styles.currSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  TO CURRENCY
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {SUPPORTED_CURRENCIES.map((c) => {
                    const isSelected = toCurr === c;
                    return (
                      <PressableScale
                        key={c}
                        style={[
                          styles.currChip,
                          {
                            backgroundColor: isSelected
                              ? colors.accentSoft
                              : isDark
                              ? colors.surfaceSubtle
                              : colors.surfaceMuted,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => {
                          haptics.selection();
                          setToCurr(c);
                        }}
                      >
                        <Text
                          style={[
                            styles.currChipText,
                            {
                              color: isSelected ? colors.accent : colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {c}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Converted Result Callout */}
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                  CONVERTED RESULT
                </Text>
                <Text style={[styles.resultValue, { color: colors.accent }]}>
                  {formatMoney(convertedAmount, toCurr)}
                </Text>
                <Text style={[styles.rateInfo, { color: colors.textMuted }]}>
                  1 {fromCurr} = {currentRate} {toCurr} • 1 {toCurr} = {invertedRate}{' '}
                  {fromCurr}
                </Text>
              </View>
            </Card>

            {/* Benchmark Currencies List */}
            <Card style={styles.card}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Global Benchmark Matrix
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Values for {formatMoney(numericAmount, fromCurr)} across key currencies
              </Text>

              <View style={styles.benchmarkList}>
                {SUPPORTED_CURRENCIES.filter((c) => c !== fromCurr).map((curr) => {
                  const meta = CURRENCY_METADATA[curr];
                  const converted = convertReferenceAmount(numericAmount, fromCurr, curr);
                  const rate = getReferenceExchangeRate(fromCurr, curr);

                  return (
                    <TouchableOpacity
                      key={curr}
                      style={[
                        styles.benchmarkRow,
                        { borderBottomColor: colors.borderSubtle },
                      ]}
                      onPress={() => {
                        haptics.selection();
                        setToCurr(curr);
                      }}
                    >
                      <View>
                        <Text style={[styles.benchmarkCode, { color: colors.textPrimary }]}>
                          {curr} - {meta?.name}
                        </Text>
                        <Text style={[styles.benchmarkRate, { color: colors.textMuted }]}>
                          Rate: {rate}
                        </Text>
                      </View>
                      <Text style={[styles.benchmarkVal, { color: colors.accent }]}>
                        {formatMoney(converted, curr)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          </View>
        )}

        {/* ===================== TAB 2: CALCULATOR ===================== */}
        {activeTab === 'calculator' && (
          <View style={styles.tabContent}>
            {/* Screen Display */}
            <Card style={styles.card}>
              <View
                style={[
                  styles.calcScreen,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Text style={[styles.calcExpression, { color: colors.textMuted }]}>
                  {calcExpr || ' '}
                </Text>
                <Text
                  style={[styles.calcDisplay, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {calcDisplay}
                </Text>
              </View>

              {/* Keypad Grid — borderless minimalist keys */}
              <View style={styles.keypadGrid}>
                {/* Row 1 */}
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: colors.dangerSoft }]}
                  onPress={handleCalcClear}
                >
                  <Text style={[styles.keyText, { color: colors.danger }]}>AC</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                  onPress={handleCalcBackspace}
                >
                  <Ionicons name="backspace-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                  onPress={handleCalcPercentage}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={() => handleCalcOperator('÷')}
                >
                  <Text style={[styles.keyText, { color: colors.accent }]}>÷</Text>
                </TouchableOpacity>

                {/* Row 2 */}
                {['7', '8', '9'].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                    onPress={() => handleCalcInput(n)}
                  >
                    <Text style={[styles.keyText, { color: colors.textPrimary }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={() => handleCalcOperator('×')}
                >
                  <Text style={[styles.keyText, { color: colors.accent }]}>×</Text>
                </TouchableOpacity>

                {/* Row 3 */}
                {['4', '5', '6'].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                    onPress={() => handleCalcInput(n)}
                  >
                    <Text style={[styles.keyText, { color: colors.textPrimary }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={() => handleCalcOperator('−')}
                >
                  <Text style={[styles.keyText, { color: colors.accent }]}>−</Text>
                </TouchableOpacity>

                {/* Row 4 */}
                {['1', '2', '3'].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                    onPress={() => handleCalcInput(n)}
                  >
                    <Text style={[styles.keyText, { color: colors.textPrimary }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: colors.accentSoft }]}
                  onPress={() => handleCalcOperator('+')}
                >
                  <Text style={[styles.keyText, { color: colors.accent }]}>+</Text>
                </TouchableOpacity>

                {/* Row 5 */}
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                  onPress={handleCalcNegate}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>±</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                  onPress={() => handleCalcInput('0')}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
                  onPress={() => handleCalcInput('.')}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }]}>.</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keyBtn, { backgroundColor: colors.accent }]}
                  onPress={handleCalcEquals}
                >
                  <Text style={[styles.keyText, { color: colors.accentForeground }]}>=</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* History Tape */}
            {calcHistory.length > 0 && (
              <Card style={styles.card}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Recent Calculations
                  </Text>
                  <TouchableOpacity onPress={() => setCalcHistory([])}>
                    <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.historyList}>
                  {calcHistory.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={[
                        styles.historyRow,
                        { borderBottomColor: colors.borderSubtle },
                      ]}
                      onPress={() => {
                        haptics.selection();
                        setCalcDisplay(h.result);
                        setCalcExpr('');
                        setJustCalculated(true);
                      }}
                    >
                      <Text style={[styles.historyExpr, { color: colors.textMuted }]}>
                        {h.expression}
                      </Text>
                      <Text style={[styles.historyRes, { color: colors.accent }]}>
                        = {h.result}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}
          </View>
        )}

        {/* ===================== TAB 3: LOAN / IOU ===================== */}
        {activeTab === 'loan' && (
          <View style={styles.tabContent}>
            <Card style={styles.card}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Loan & IOU Repayment
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Supports personal interest-free IOUs (0% APR) and bank loans
              </Text>

              <Input
                label="Principal Amount"
                keyboardType="numeric"
                value={loanPrincipal}
                onChangeText={setLoanPrincipal}
                leftIcon="cash-outline"
                placeholder="5000"
              />

              <Input
                label="Annual Interest Rate (% APR)"
                hint="Use 0% for zero-interest loans or friend IOUs"
                keyboardType="numeric"
                value={loanRate}
                onChangeText={setLoanRate}
                leftIcon="calculator-outline"
                placeholder="5.0"
              />

              <Input
                label="Term Duration (Months)"
                keyboardType="numeric"
                value={loanMonths}
                onChangeText={setLoanMonths}
                leftIcon="calendar-outline"
                placeholder="12"
              />

              {/* Monthly Repayment Banner */}
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                  ESTIMATED MONTHLY PAYMENT
                </Text>
                <Text style={[styles.resultValue, { color: colors.accent }]}>
                  {formatMoney(loanCalculation.monthlyPayment, activeWorkspace?.currency)}
                </Text>
                <Text style={[styles.rateInfo, { color: colors.textMuted }]}>
                  Total Interest:{' '}
                  {formatMoney(loanCalculation.totalInterest, activeWorkspace?.currency)} •
                  Total Repaid:{' '}
                  {formatMoney(loanCalculation.totalRepayment, activeWorkspace?.currency)}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* ===================== TAB 4: SAVINGS ===================== */}
        {activeTab === 'savings' && (
          <View style={styles.tabContent}>
            <Card style={styles.card}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Savings Growth Projector
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Forecast future net worth and compound interest returns
              </Text>

              <Input
                label="Starting Deposit"
                keyboardType="numeric"
                value={savingsInitial}
                onChangeText={setSavingsInitial}
                leftIcon="wallet-outline"
                placeholder="1000"
              />

              <Input
                label="Monthly Contribution"
                keyboardType="numeric"
                value={savingsMonthly}
                onChangeText={setSavingsMonthly}
                leftIcon="cash-outline"
                placeholder="200"
              />

              <Input
                label="Time Horizon (Years)"
                keyboardType="numeric"
                value={savingsYears}
                onChangeText={setSavingsYears}
                leftIcon="time-outline"
                placeholder="5"
              />

              <Input
                label="Expected Annual Return (% APY)"
                hint="e.g. 4.0% for high-yield savings, 7.0% for index funds"
                keyboardType="numeric"
                value={savingsRate}
                onChangeText={setSavingsRate}
                leftIcon="trending-up-outline"
                placeholder="7.0"
              />

              {/* Future Value Banner */}
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
                  FUTURE VALUE IN {savingsYears} YEARS
                </Text>
                <Text style={[styles.resultValue, { color: colors.accent }]}>
                  {formatMoney(savingsCalculation.futureValue, activeWorkspace?.currency)}
                </Text>
                <Text style={[styles.rateInfo, { color: colors.textMuted }]}>
                  Your Deposits:{' '}
                  {formatMoney(
                    savingsCalculation.totalContributed,
                    activeWorkspace?.currency
                  )}{' '}
                  • Compound Profit:{' '}
                  {formatMoney(
                    savingsCalculation.totalInterest,
                    activeWorkspace?.currency
                  )}
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  tabBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  tabText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xl * 2,
  },
  tabContent: {
    gap: spacing.base,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.base,
  },
  sectionHeading: {
    ...typography.title,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginBottom: spacing.base,
  },
  currSection: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  chipScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  currChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  currChipText: {
    ...typography.caption,
    fontSize: 11,
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  swapDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  swapCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBox: {
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  resultLabel: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  resultValue: {
    ...typography.heading,
    fontSize: 26,
    fontWeight: '800',
  },
  rateInfo: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  benchmarkList: {
    marginTop: spacing.xs,
  },
  benchmarkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  benchmarkCode: {
    ...typography.body,
    fontWeight: '600',
  },
  benchmarkRate: {
    ...typography.caption,
    fontSize: 11,
  },
  benchmarkVal: {
    ...typography.body,
    fontWeight: '700',
  },
  // Calculator styles
  calcScreen: {
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 84,
    marginBottom: spacing.base,
  },
  calcExpression: {
    ...typography.caption,
    fontSize: 12,
  },
  calcDisplay: {
    ...typography.heading,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 2,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: '22.5%',
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    ...typography.title,
    fontSize: 19,
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clearBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  historyList: {
    marginTop: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyExpr: {
    ...typography.caption,
    fontSize: 12,
  },
  historyRes: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
  },
});

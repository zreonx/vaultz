"use client";

import { useEffect, useState } from "react";
import {
  Calculator as CalcIcon,
  Check,
  Clock,
  Copy,
  Delete,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

/**
 * Safe arithmetic expression evaluator using recursive descent parsing.
 * Supports: +, -, *, /, %, parentheses, unary plus/minus, decimals.
 * Does NOT use eval() or Function().
 */
function evaluateExpression(expr: string): number {
  // Normalize symbols
  const sanitized = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s+/g, "");

  if (!sanitized) return 0;

  let pos = 0;

  function peek(): string {
    return sanitized[pos] || "";
  }

  function get(): string {
    return sanitized[pos++] || "";
  }

  // Parse top-level + and -
  function parseExpression(): number {
    let result = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = get();
      const nextTerm = parseTerm();
      if (op === "+") result += nextTerm;
      else result -= nextTerm;
    }
    return result;
  }

  // Parse * and / and %
  function parseTerm(): number {
    let result = parseFactor();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = get();
      const nextFactor = parseFactor();
      if (op === "*") {
        result *= nextFactor;
      } else if (op === "/") {
        if (nextFactor === 0) throw new Error("Division by zero");
        result /= nextFactor;
      } else if (op === "%") {
        if (nextFactor === 0) throw new Error("Modulo by zero");
        result %= nextFactor;
      }
    }
    return result;
  }

  // Parse unary -, parentheses, and numbers
  function parseFactor(): number {
    if (peek() === "+") {
      get();
      return parseFactor();
    }
    if (peek() === "-") {
      get();
      return -parseFactor();
    }
    if (peek() === "(") {
      get(); // consume '('
      const result = parseExpression();
      if (peek() === ")") {
        get(); // consume ')'
      }
      return result;
    }

    let numStr = "";
    while (
      (peek() >= "0" && peek() <= "9") ||
      peek() === "."
    ) {
      numStr += get();
    }

    if (!numStr) {
      throw new Error("Invalid number expression");
    }

    const val = parseFloat(numStr);
    if (Number.isNaN(val)) throw new Error("Invalid number");
    return val;
  }

  const result = parseExpression();
  if (pos < sanitized.length) {
    throw new Error("Unexpected character at end of expression");
  }
  return result;
}

export function StandardCalculator() {
  const [display, setDisplay] = useState<string>("0");
  const [expression, setExpression] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [justCalculated, setJustCalculated] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Handle digit / dot input
  const handleInput = (val: string) => {
    if (justCalculated) {
      if (/[0-9.]/.test(val)) {
        setDisplay(val === "." ? "0." : val);
        setExpression("");
      } else {
        // Operator clicked right after calculate -> continue with result
        setExpression(display + " " + val + " ");
        setDisplay("0");
      }
      setJustCalculated(false);
      return;
    }

    if (val === ".") {
      if (!display.includes(".")) {
        setDisplay((prev) => prev + ".");
      }
      return;
    }

    setDisplay((prev) => (prev === "0" ? val : prev + val));
  };

  // Handle operator (+, −, ×, ÷, %)
  const handleOperator = (op: string) => {
    if (justCalculated) {
      setExpression(display + " " + op + " ");
      setDisplay("0");
      setJustCalculated(false);
      return;
    }

    if (expression && display === "0") {
      // Replace last operator
      setExpression((prev) => prev.trim().slice(0, -1) + op + " ");
      return;
    }

    setExpression((prev) => prev + display + " " + op + " ");
    setDisplay("0");
  };

  // Handle clear all
  const handleClear = () => {
    setDisplay("0");
    setExpression("");
    setJustCalculated(false);
  };

  // Handle backspace
  const handleBackspace = () => {
    if (justCalculated) {
      handleClear();
      return;
    }
    setDisplay((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  // Handle negate (+/-)
  const handleNegate = () => {
    if (display === "0") return;
    if (display.startsWith("-")) {
      setDisplay(display.slice(1));
    } else {
      setDisplay("-" + display);
    }
  };

  // Handle percentage of current input
  const handlePercentage = () => {
    const num = parseFloat(display);
    if (!Number.isNaN(num)) {
      const pct = num / 100;
      setDisplay(pct.toString());
    }
  };

  // Handle equals
  const handleCalculate = () => {
    const fullExpr = (expression + display).trim();
    if (!fullExpr) return;

    try {
      const res = evaluateExpression(fullExpr);
      // Format result cleanly
      const formattedRes =
        Math.abs(res) < 1e-7 && res !== 0
          ? res.toExponential(4)
          : Number(res.toFixed(8)).toString();

      const newItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        expression: fullExpr,
        result: formattedRes,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
      setDisplay(formattedRes);
      setExpression(fullExpr + " =");
      setJustCalculated(true);
    } catch {
      toast.error("Invalid arithmetic expression");
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key >= "0" && e.key <= "9") {
        handleInput(e.key);
      } else if (e.key === ".") {
        handleInput(".");
      } else if (e.key === "+") {
        handleOperator("+");
      } else if (e.key === "-") {
        handleOperator("−");
      } else if (e.key === "*") {
        handleOperator("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "%") {
        handlePercentage();
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(display);
      setIsCopied(true);
      toast.success("Result copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const recallHistory = (item: HistoryItem) => {
    setDisplay(item.result);
    setExpression("");
    setJustCalculated(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Calculator */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
        <Card className="w-full max-w-md shadow-md border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalcIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Standard Calculator</CardTitle>
                  <CardDescription className="text-xs">
                    Quick financial math & arithmetic
                  </CardDescription>
                </div>
              </div>
              <Badge variant="neutral" className="text-xs font-mono">
                Keyboard Active
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 pb-6 space-y-4">
            {/* Screen / Display */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border/40 flex flex-col items-end justify-between min-h-[100px] text-right">
              <span className="text-xs font-mono text-muted-foreground h-5 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                {expression || "\u00A0"}
              </span>
              <div className="flex items-baseline justify-between w-full mt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                  title="Copy result"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <span className="text-3xl sm:text-4xl font-semibold font-mono tracking-tight text-foreground truncate max-w-[280px]">
                  {display}
                </span>
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2.5">
              {/* Row 1 */}
              <Button
                variant="outline"
                className="h-13 text-base font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClear}
              >
                AC
              </Button>
              <Button
                variant="outline"
                className="h-13 text-base font-medium"
                onClick={handleBackspace}
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="h-13 text-base font-medium"
                onClick={handlePercentage}
              >
                %
              </Button>
              <Button
                variant="secondary"
                className="h-13 text-lg font-semibold bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={() => handleOperator("÷")}
              >
                ÷
              </Button>

              {/* Row 2 */}
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("7")}
              >
                7
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("8")}
              >
                8
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("9")}
              >
                9
              </Button>
              <Button
                variant="secondary"
                className="h-13 text-lg font-semibold bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={() => handleOperator("×")}
              >
                ×
              </Button>

              {/* Row 3 */}
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("4")}
              >
                4
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("5")}
              >
                5
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("6")}
              >
                6
              </Button>
              <Button
                variant="secondary"
                className="h-13 text-lg font-semibold bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={() => handleOperator("−")}
              >
                −
              </Button>

              {/* Row 4 */}
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("1")}
              >
                1
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("2")}
              >
                2
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("3")}
              >
                3
              </Button>
              <Button
                variant="secondary"
                className="h-13 text-lg font-semibold bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={() => handleOperator("+")}
              >
                +
              </Button>

              {/* Row 5 */}
              <Button
                variant="outline"
                className="h-13 text-base font-medium"
                onClick={handleNegate}
              >
                ±
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput("0")}
              >
                0
              </Button>
              <Button
                variant="outline"
                className="h-13 text-lg font-medium"
                onClick={() => handleInput(".")}
              >
                .
              </Button>
              <Button
                className="h-13 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow"
                onClick={handleCalculate}
              >
                =
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tape */}
      <div className="lg:col-span-5 xl:col-span-4">
        <Card className="h-full border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">History Tape</CardTitle>
              </div>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                  onClick={() => setHistory([])}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Recent calculations are stored locally
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {history.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No calculations yet</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Evaluated equations will appear here for easy reference.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => recallHistory(item)}
                    className="w-full text-left p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/40 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-mono text-ellipsis overflow-hidden pr-2">
                        {item.expression}
                      </span>
                      <span className="shrink-0">{item.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold font-mono text-foreground group-hover:text-primary transition-colors">
                        = {item.result}
                      </span>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Recall
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

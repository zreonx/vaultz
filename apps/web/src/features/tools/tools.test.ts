import { describe, expect, it } from "vitest";

// Safe evaluator test mirror
function evaluateTestExpression(expr: string): number {
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
      get();
      const result = parseExpression();
      if (peek() === ")") get();
      return result;
    }

    let numStr = "";
    while ((peek() >= "0" && peek() <= "9") || peek() === ".") {
      numStr += get();
    }
    if (!numStr) throw new Error("Invalid number expression");
    const val = parseFloat(numStr);
    if (Number.isNaN(val)) throw new Error("Invalid number");
    return val;
  }

  return parseExpression();
}

describe("Calculators and Utilities", () => {
  describe("Arithmetic Evaluator", () => {
    it("evaluates basic arithmetic correctly", () => {
      expect(evaluateTestExpression("12 + 8")).toBe(20);
      expect(evaluateTestExpression("100 − 35")).toBe(65);
      expect(evaluateTestExpression("15 × 4")).toBe(60);
      expect(evaluateTestExpression("100 ÷ 4")).toBe(25);
    });

    it("respects operator precedence and parentheses", () => {
      expect(evaluateTestExpression("2 + 3 × 4")).toBe(14);
      expect(evaluateTestExpression("(2 + 3) × 4")).toBe(20);
      expect(evaluateTestExpression("50 + 10 % 3")).toBe(51);
    });

    it("handles decimal numbers and unary minus", () => {
      expect(evaluateTestExpression("12.5 × 2")).toBe(25);
      expect(evaluateTestExpression("-10 + 25")).toBe(15);
    });
  });

  describe("Loan & Amortization Calculations", () => {
    it("calculates 0% interest loans correctly", () => {
      const principal = 1200;
      const termMonths = 12;
      const payment = principal / termMonths;
      expect(payment).toBe(100);
    });

    it("calculates standard interest repayment correctly", () => {
      const principal = 10000;
      const annualRate = 6;
      const months = 12;
      const monthlyRate = annualRate / 100 / 12;
      const factor = Math.pow(1 + monthlyRate, months);
      const payment = (principal * (monthlyRate * factor)) / (factor - 1);

      expect(payment).toBeGreaterThan(860);
      expect(payment).toBeLessThan(862);
      const totalRepaid = payment * months;
      expect(totalRepaid).toBeGreaterThan(principal);
    });
  });

  describe("Savings Compound Interest Projection", () => {
    it("projects compound interest with monthly additions", () => {
      let balance = 1000;
      const monthlyDeposit = 100;
      const annualReturn = 0.06;
      const monthlyRate = annualReturn / 12;

      for (let m = 1; m <= 12; m++) {
        balance += balance * monthlyRate;
        balance += monthlyDeposit;
      }

      // Initial 1000 + (12 * 100) = 2200 deposited + compound growth
      expect(balance).toBeGreaterThan(2260);
    });
  });
});

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Sparkles,
  X,
} from "lucide-react";
import { useTutorial } from "@/context/tutorial-context";
import { Button } from "@/components/ui/button";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SpotlightTour() {
  const {
    isTourActive,
    currentStepIndex,
    currentTourStep,
    totalTourSteps,
    nextStep,
    prevStep,
    skipTour,
    openCreateAccount,
    openRecordTransaction,
  } = useTutorial();

  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverHeight, setPopoverHeight] = useState<number>(240);

  // Measure popover height when content changes
  useEffect(() => {
    if (popoverRef.current) {
      setPopoverHeight(popoverRef.current.offsetHeight || 240);
    }
  }, [currentTourStep]);

  // Update target bounding box
  const updateRect = useCallback(() => {
    if (!currentTourStep) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentTourStep.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentTourStep]);

  // Scroll target into view and sync rect
  useEffect(() => {
    if (!isTourActive || !currentTourStep) {
      setTargetRect(null);
      return;
    }

    const tryFocusElement = () => {
      const element = document.querySelector(currentTourStep.selector);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        // Short timeout for scroll to finish before calculating final bounding rect
        const timer = setTimeout(() => {
          updateRect();
        }, 300);
        return () => clearTimeout(timer);
      } else {
        // If element is not rendered yet, retry once after 250ms
        const retryTimer = setTimeout(() => {
          const retryEl = document.querySelector(currentTourStep.selector);
          if (retryEl) {
            retryEl.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
            setTimeout(updateRect, 300);
          } else {
            setTargetRect(null);
          }
        }, 250);
        return () => clearTimeout(retryTimer);
      }
    };

    const cleanup = tryFocusElement();

    const handleScrollResize = () => {
      requestAnimationFrame(updateRect);
    };

    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [isTourActive, currentTourStep, updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTour();
      } else if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTourActive, nextStep, prevStep, skipTour]);

  if (!isTourActive || !currentTourStep) {
    return null;
  }

  // Calculate Popover Position
  const popoverWidth = 380;
  const padding = 16;
  let popoverTop = 0;
  let popoverLeft = 0;
  let isCentered = false;

  if (targetRect) {
    // Check if there is enough space below the target
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height + 16);
    const spaceAbove = targetRect.top - 16;

    if (spaceBelow >= popoverHeight + 10) {
      // Place below
      popoverTop = targetRect.top + targetRect.height + 16;
    } else if (spaceAbove >= popoverHeight + 10) {
      // Place above
      popoverTop = Math.max(padding, targetRect.top - popoverHeight - 16);
    } else {
      // Not enough space above or below: place alongside or clamp within viewport
      popoverTop = Math.max(
        padding,
        Math.min(targetRect.top, window.innerHeight - popoverHeight - padding)
      );
    }

    // Align horizontally with target, clamped to screen edges
    popoverLeft = Math.max(
      padding,
      Math.min(
        targetRect.left,
        window.innerWidth - popoverWidth - padding
      )
    );
  } else {
    // If target element is not found on screen, display in center
    isCentered = true;
  }

  const isLastStep = currentStepIndex === totalTourSteps - 1;

  const handleAction = () => {
    if (currentTourStep.actionType === "create_account") {
      openCreateAccount();
    } else if (currentTourStep.actionType === "record_transaction") {
      openRecordTransaction();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] select-none">
      {/* SVG Backdrop with Cutout Spotlight */}
      <svg
        className="fixed inset-0 h-full w-full pointer-events-auto"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="vaultz-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#vaultz-spotlight-mask)"
          className="transition-all duration-300"
          onClick={skipTour}
        />
      </svg>

      {/* Pulsing Emerald Border Ring around focused component */}
      {targetRect && (
        <div
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className="fixed pointer-events-none rounded-[14px] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-black/20 shadow-[0_0_30px_rgba(42,107,88,0.5)] transition-all duration-300"
        />
      )}

      {/* Tour Step Popover Card */}
      <div
        ref={popoverRef}
        style={
          isCentered
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: `min(${popoverWidth}px, calc(100vw - 32px))`,
              }
            : {
                top: `${popoverTop}px`,
                left: `${popoverLeft}px`,
                width: `min(${popoverWidth}px, calc(100vw - 32px))`,
              }
        }
        className="fixed z-[110] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl transition-all duration-300"
      >
        {/* Header: Step Badge & Close */}
        <div className="flex items-center justify-between gap-3 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              Step {currentStepIndex + 1} of {totalTourSteps}: {currentTourStep.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={skipTour}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
            title="Exit Tour (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title & Body */}
        <div className="space-y-1.5 py-1">
          <h4 className="text-base font-semibold leading-snug">
            {currentTourStep.title}
          </h4>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            {currentTourStep.description}
          </p>
        </div>

        {/* Optional Action Button (e.g. Try opening the dialog) */}
        {currentTourStep.actionText && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAction}
              className="w-full text-xs gap-1.5 border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{currentTourStep.actionText}</span>
            </Button>
          </div>
        )}

        {/* Footer: Progress Dots + Controls */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalTourSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStepIndex
                    ? "w-4 bg-[var(--accent)]"
                    : "w-1.5 bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="h-8 px-2.5 text-xs text-[var(--muted-foreground)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={nextStep}
              className="h-8 px-3 text-xs gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90 shadow-sm"
            >
              <span>{isLastStep ? "Finish" : "Next"}</span>
              {isLastStep ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

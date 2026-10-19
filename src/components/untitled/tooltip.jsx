// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, scoped reset, and React 18 input refs.
"use client";

import { Button as AriaButton, OverlayArrow as AriaOverlayArrow, Tooltip as AriaTooltip, TooltipTrigger as AriaTooltipTrigger } from "react-aria-components";
import { cx } from "./utils/cx";
export const Tooltip = ({
  title,
  description,
  children,
  arrow = false,
  delay = 300,
  closeDelay = 0,
  trigger,
  isDisabled,
  isOpen,
  defaultOpen,
  offset = 6,
  crossOffset,
  placement = "top",
  onOpenChange,
  ...tooltipProps
}) => {
  const isTopOrBottomLeft = ["top left", "top end", "bottom left", "bottom end"].includes(placement);
  const isTopOrBottomRight = ["top right", "top start", "bottom right", "bottom start"].includes(placement);
  // Set negative cross offset for left and right placement to visually balance the tooltip.
  const calculatedCrossOffset = isTopOrBottomLeft ? -12 : isTopOrBottomRight ? 12 : 0;
  return <AriaTooltipTrigger {...{
    trigger,
    delay,
    closeDelay,
    isDisabled,
    isOpen,
    defaultOpen,
    onOpenChange
  }}>
            {children}

            <AriaTooltip {...tooltipProps} offset={offset} placement={placement} crossOffset={crossOffset ?? calculatedCrossOffset} className={({
      isEntering,
      isExiting
    }) => cx(isEntering && "uui:ease-out uui:animate-in", isExiting && "uui:ease-in uui:animate-out")}>
                {({
        isEntering,
        isExiting
      }) => <div className={cx("uui:z-50 uui:flex uui:max-w-xs uui:origin-(--trigger-anchor-point) uui:flex-col uui:items-start uui:gap-1 uui:rounded-lg uui:bg-primary-solid uui:px-3 uui:shadow-lg uui:will-change-transform", description ? "uui:py-3" : "uui:py-2", isEntering && "uui:ease-out uui:animate-in uui:fade-in uui:zoom-in-95 uui:in-placement-left:slide-in-from-right-0.5 uui:in-placement-right:slide-in-from-left-0.5 uui:in-placement-top:slide-in-from-bottom-0.5 uui:in-placement-bottom:slide-in-from-top-0.5", isExiting && "uui:ease-in uui:animate-out uui:fade-out uui:zoom-out-95 uui:in-placement-left:slide-out-to-right-0.5 uui:in-placement-right:slide-out-to-left-0.5 uui:in-placement-top:slide-out-to-bottom-0.5 uui:in-placement-bottom:slide-out-to-top-0.5")}>
                        <span className="uui:text-xs uui:font-semibold uui:text-white">{title}</span>

                        {description && <span className="uui:text-xs uui:font-medium uui:text-tooltip-supporting-text">{description}</span>}

                        {arrow && <AriaOverlayArrow>
                                <svg viewBox="0 0 100 100" className="uui:size-2.5 uui:fill-bg-primary-solid uui:in-placement-left:-rotate-90 uui:in-placement-right:rotate-90 uui:in-placement-top:rotate-0 uui:in-placement-bottom:rotate-180">
                                    <path d="M0,0 L35.858,35.858 Q50,50 64.142,35.858 L100,0 Z" />
                                </svg>
                            </AriaOverlayArrow>}
                    </div>}
            </AriaTooltip>
        </AriaTooltipTrigger>;
};
export const TooltipTrigger = ({
  children,
  className,
  ...buttonProps
}) => {
  return <AriaButton {...buttonProps} className={values => cx("uui:h-max uui:w-max uui:outline-hidden", typeof className === "function" ? className(values) : className)}>
            {children}
        </AriaButton>;
};

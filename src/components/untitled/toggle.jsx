// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, and scoped reset adaptations.
"use client";
import "./styles/generated.css";

import { Switch as AriaSwitch } from "react-aria-components";
import { cx } from "./utils/cx";
export const ToggleBase = ({
  className,
  isHovered,
  isDisabled,
  isFocusVisible,
  isSelected,
  slim,
  size = "sm"
}) => {
  const styles = {
    default: {
      sm: {
        root: "uui:h-5 uui:w-9 uui:p-0.5",
        switch: cx("uui:size-4", isSelected && "uui:translate-x-4")
      },
      md: {
        root: "uui:h-6 uui:w-11 uui:p-0.5",
        switch: cx("uui:size-5", isSelected && "uui:translate-x-5")
      }
    },
    slim: {
      sm: {
        root: "uui:h-4 uui:w-8",
        switch: cx("uui:size-4", isSelected && "uui:translate-x-4")
      },
      md: {
        root: "uui:h-5 uui:w-10",
        switch: cx("uui:size-5", isSelected && "uui:translate-x-5")
      }
    }
  };
  const classes = slim ? styles.slim[size] : styles.default[size];
  return <div className={cx("uui:cursor-pointer uui:rounded-full uui:bg-tertiary uui:ring-[0.5px] uui:ring-secondary uui:outline-focus-ring uui:transition uui:duration-150 uui:ease-linear uui:ring-inset", isSelected && "uui:bg-brand-solid", isSelected && isHovered && "uui:bg-brand-solid_hover", isDisabled && "uui:cursor-not-allowed uui:opacity-50", isFocusVisible && "uui:outline-2 uui:outline-offset-2", slim && "uui:ring-1", slim && isSelected && "uui:ring-transparent", classes.root, className)}>
            <div style={{
      transition: "transform 0.15s ease-in-out, translate 0.15s ease-in-out, border-color 0.1s linear, background-color 0.1s linear"
    }} className={cx("uui:rounded-full uui:bg-fg-white uui:shadow-sm", slim && "uui:shadow-xs", slim && "uui:border uui:border-toggle-border", slim && isSelected && "uui:border-toggle-slim-border_pressed", slim && isSelected && isHovered && "uui:border-toggle-slim-border_pressed-hover", classes.switch)} />
        </div>;
};
const styles = {
  sm: {
    root: "uui:gap-2",
    textWrapper: "",
    label: "uui:text-sm uui:font-medium",
    hint: "uui:text-sm"
  },
  md: {
    root: "uui:gap-3",
    textWrapper: "uui:gap-0.5",
    label: "uui:text-md uui:font-medium",
    hint: "uui:text-md"
  }
};
export const Toggle = ({
  label,
  hint,
  className,
  size = "sm",
  slim,
  ...ariaSwitchProps
}) => {
  return <AriaSwitch data-untitled-control data-untitled-toggle {...ariaSwitchProps} className={state => cx("uui:relative uui:flex uui:w-max uui:items-start", state.isDisabled && "uui:cursor-not-allowed", styles[size].root, typeof className === "function" ? className(state) : className)}>
            {({
      isSelected,
      isDisabled,
      isFocusVisible,
      isHovered
    }) => <>
                    <ToggleBase slim={slim} size={size} isHovered={isHovered} isDisabled={isDisabled} isFocusVisible={isFocusVisible} isSelected={isSelected} className={slim ? "uui:mt-0.5" : ""} />

                    {(label || hint) && <div className={cx("uui:flex uui:flex-col", styles[size].textWrapper)}>
                            {label && <p className={cx("uui:text-secondary uui:select-none", styles[size].label)}>{label}</p>}
                            {hint && <span className={cx("uui:text-tertiary", styles[size].hint)} onClick={event => event.stopPropagation()}>
                                    {hint}
                                </span>}
                        </div>}
                </>}
        </AriaSwitch>;
};

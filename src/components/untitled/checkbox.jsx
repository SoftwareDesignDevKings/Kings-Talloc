// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, and scoped reset adaptations.
"use client";
import "./styles/generated.css";

import { Checkbox as AriaCheckbox } from "react-aria-components";
import { cx } from "./utils/cx";
export const CheckboxBase = ({
  className,
  isSelected,
  isDisabled,
  isIndeterminate,
  size = "sm",
  isFocusVisible = false
}) => {
  return <div className={cx("uui:relative uui:flex uui:size-4 uui:shrink-0 uui:cursor-pointer uui:appearance-none uui:items-center uui:justify-center uui:rounded uui:bg-primary uui:ring-1 uui:ring-primary uui:ring-inset", size === "md" && "uui:size-5 uui:rounded-md", (isSelected || isIndeterminate) && "uui:bg-brand-solid uui:ring-brand-solid", isDisabled && "uui:cursor-not-allowed uui:opacity-50", isDisabled && !(isSelected || isIndeterminate) && "uui:bg-tertiary", isFocusVisible && "uui:outline-2 uui:outline-offset-2 uui:outline-focus-ring", className)}>
            <svg aria-hidden="true" viewBox="0 0 14 14" fill="none" className={cx("uui:pointer-events-none uui:absolute uui:h-3 uui:w-2.5 uui:text-fg-white uui:opacity-0 uui:transition-inherit-all", size === "md" && "uui:size-3.5", isIndeterminate && "uui:opacity-100")}>
                <path d="M2.91675 7H11.0834" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <svg aria-hidden="true" viewBox="0 0 14 14" fill="none" className={cx("uui:pointer-events-none uui:absolute uui:size-3 uui:text-fg-white uui:opacity-0 uui:transition-inherit-all", size === "md" && "uui:size-3.5", isSelected && !isIndeterminate && "uui:opacity-100")}>
                <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>;
};
CheckboxBase.displayName = "CheckboxBase";
export const Checkbox = ({
  label,
  hint,
  size = "sm",
  className,
  ...ariaCheckboxProps
}) => {
  const sizes = {
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
  return <AriaCheckbox data-untitled-control {...ariaCheckboxProps} className={state => cx("uui:relative uui:flex uui:items-start", state.isDisabled && "uui:cursor-not-allowed", sizes[size].root, typeof className === "function" ? className(state) : className)}>
            {({
      isSelected,
      isIndeterminate,
      isDisabled,
      isFocusVisible
    }) => <>
                    <CheckboxBase size={size} isSelected={isSelected} isIndeterminate={isIndeterminate} isDisabled={isDisabled} isFocusVisible={isFocusVisible} className={label || hint ? "uui:mt-0.5" : ""} />
                    {(label || hint) && <div className={cx("uui:inline-flex uui:flex-col", sizes[size].textWrapper)}>
                            {label && <p className={cx("uui:text-secondary uui:select-none", sizes[size].label)}>{label}</p>}
                            {hint && <span className={cx("uui:text-tertiary", sizes[size].hint)} onClick={event => event.stopPropagation()}>
                                    {hint}
                                </span>}
                        </div>}
                </>}
        </AriaCheckbox>;
};
Checkbox.displayName = "Checkbox";

// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, scoped reset, and React 18 input refs.
"use client";
import "./styles/generated.css";

import { forwardRef, createContext, useContext, useState } from "react";
import { Eye, EyeOff, HelpCircle, InfoCircle } from "@untitledui/icons";
import { Button as AriaButton, Group as AriaGroup, Input as AriaInput, TextField as AriaTextField } from "react-aria-components";
import { HintText } from "./hint-text";
import { Label } from "./label";
import { Tooltip, TooltipTrigger } from "./tooltip";
import { cx, sortCx } from "./utils/cx";
export const InputBase = forwardRef(({
  tooltip,
  shortcut,
  groupRef,
  size = "md",
  isInvalid,
  isDisabled,
  isRequired,
  icon: Icon,
  placeholder,
  wrapperClassName,
  tooltipClassName,
  inputClassName,
  iconClassName,
  type = "text",
  ...inputProps
}, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // Check if the input has a leading icon or tooltip
  const hasTrailingIcon = tooltip || isInvalid;
  const hasLeadingIcon = Icon;
  // If the input is inside a `TextFieldContext`, use its context to simplify applying styles
  const context = useContext(TextFieldContext);
  const inputSize = context?.size || size;
  const sizes = sortCx({
    sm: {
      root: cx("uui:px-3 uui:py-2 uui:text-sm", hasLeadingIcon && "uui:pl-9", hasTrailingIcon && "uui:pr-9"),
      iconLeading: "uui:left-3 uui:size-4 uui:stroke-[2.25px]",
      iconTrailing: "uui:right-3",
      shortcut: "uui:pr-1.5"
    },
    md: {
      root: cx("uui:px-3 uui:py-2 uui:text-md", hasLeadingIcon && "uui:pl-10", hasTrailingIcon && "uui:pr-9"),
      iconLeading: "uui:left-3 uui:size-5",
      iconTrailing: "uui:right-3",
      shortcut: "uui:pr-2"
    },
    lg: {
      root: cx("uui:px-3.5 uui:py-2.5 uui:text-md", hasLeadingIcon && "uui:pl-10.5", hasTrailingIcon && "uui:pr-9.5"),
      iconLeading: "uui:left-3.5 uui:size-5",
      iconTrailing: "uui:right-3.5",
      shortcut: "uui:pr-2.5"
    }
  });
  return <AriaGroup {...{
    isDisabled,
    isInvalid
  }} ref={groupRef} className={({
    isFocusWithin,
    isDisabled,
    isInvalid
  }) => cx("uui:group/input uui:relative uui:flex uui:w-full uui:flex-row uui:place-content-center uui:place-items-center uui:rounded-lg uui:bg-primary uui:shadow-xs uui:ring-1 uui:ring-primary uui:transition-shadow uui:duration-100 uui:ease-linear uui:ring-inset", isFocusWithin && !isDisabled && "uui:ring-2 uui:ring-brand",
  // Disabled state styles
  isDisabled && "uui:cursor-not-allowed uui:opacity-50", "uui:group-disabled:cursor-not-allowed uui:group-disabled:opacity-50",
  // Invalid state styles
  isInvalid && "uui:ring-error_subtle", "uui:group-invalid:ring-error_subtle",
  // Invalid state with focus-within styles
  isInvalid && isFocusWithin && "uui:ring-2 uui:ring-error", isFocusWithin && "uui:group-invalid:ring-2 uui:group-invalid:ring-error", context?.wrapperClassName, wrapperClassName)}>
            {/* Leading icon and Payment icon */}
            {Icon && <Icon className={cx("uui:pointer-events-none uui:absolute uui:text-fg-quaternary", sizes[inputSize].iconLeading, context?.iconClassName, iconClassName)} />}

            {/* Input field */}
            <AriaInput {...inputProps} ref={ref} required={isRequired} type={type === "password" && isPasswordVisible ? "text" : type} placeholder={placeholder} className={cx("uui:m-0 uui:w-full uui:bg-transparent uui:text-primary uui:ring-0 uui:outline-hidden uui:placeholder:text-placeholder uui:autofill:rounded-lg uui:autofill:text-primary uui:disabled:cursor-not-allowed", sizes[inputSize].root, context?.inputClassName, inputClassName)} />

            {/* Tooltip and help icon */}
            {tooltip && type !== "password" && <Tooltip title={tooltip} placement="top">
                    <TooltipTrigger className={cx("uui:absolute uui:cursor-pointer uui:text-fg-quaternary uui:transition uui:duration-100 uui:ease-linear uui:group-invalid/input:hidden uui:hover:text-fg-quaternary_hover uui:focus:text-fg-quaternary_hover", sizes[inputSize].iconTrailing, context?.tooltipClassName, tooltipClassName)}>
                        <HelpCircle className="uui:size-4 uui:stroke-[2.25px]" />
                    </TooltipTrigger>
                </Tooltip>}

            {/* Invalid icon */}
            {type !== "password" && <InfoCircle className={cx("uui:pointer-events-none uui:absolute uui:hidden uui:size-4 uui:stroke-[2.25px] uui:text-fg-error-secondary uui:group-invalid/input:block", sizes[inputSize].iconTrailing, context?.tooltipClassName, tooltipClassName)} />}

            {/* Password visibility toggle */}
            {type === "password" && <AriaButton aria-label="Toggle password visibility" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className={cx("uui:absolute uui:flex uui:cursor-pointer uui:items-center uui:justify-center uui:text-fg-quaternary uui:transition uui:duration-100 uui:ease-linear uui:hover:text-fg-quaternary_hover uui:focus:text-fg-quaternary_hover uui:focus:outline-hidden", sizes[inputSize].iconTrailing)}>
                    {isPasswordVisible ? <EyeOff className="uui:size-4 uui:stroke-[2.25px]" /> : <Eye className="uui:size-4 uui:stroke-[2.25px]" />}
                </AriaButton>}

            {/* Shortcut */}
            {shortcut && <div className={cx("uui:pointer-events-none uui:absolute uui:inset-y-0.5 uui:right-0.5 uui:z-10 uui:hidden uui:items-center uui:rounded-r-[inherit] uui:bg-linear-to-r uui:from-transparent uui:to-bg-primary uui:to-40% uui:pl-8 uui:md:flex", sizes[inputSize].shortcut)}>
                    <span aria-hidden="true" className="uui:pointer-events-none uui:rounded uui:px-1 uui:py-px uui:text-xs uui:font-medium uui:text-quaternary uui:ring-1 uui:ring-secondary uui:select-none uui:ring-inset">
                        {typeof shortcut === "string" ? shortcut : "⌘K"}
                    </span>
                </div>}
        </AriaGroup>;
});

InputBase.displayName = "InputBase";
const TextFieldContext = createContext({});
export const TextField = ({
  className,
  size = "md",
  inputClassName,
  wrapperClassName,
  iconClassName,
  tooltipClassName,
  ...props
}) => {
  return <TextFieldContext.Provider value={{
    inputClassName,
    wrapperClassName,
    iconClassName,
    tooltipClassName,
    size
  }}>
            <AriaTextField data-untitled-input {...props} data-input-wrapper data-input-size={size} className={state => cx("uui:group uui:flex uui:h-max uui:w-full uui:flex-col uui:items-start uui:justify-start uui:gap-1.5", typeof className === "function" ? className(state) : className)} />
        </TextFieldContext.Provider>;
};
TextField.displayName = "TextField";
export const Input = forwardRef(({
  size = "md",
  placeholder,
  icon: Icon,
  label,
  hint,
  shortcut,
  hideRequiredIndicator,
  className,
  groupRef,
  tooltip,
  iconClassName,
  inputClassName,
  wrapperClassName,
  tooltipClassName,
  type = "text",
  ...props
}, ref) => {
  return <TextField aria-label={!label ? placeholder : undefined} {...props} size={size} className={className}>
            {({
      isRequired,
      isInvalid
    }) => <>
                    {label && <Label isRequired={hideRequiredIndicator ? !hideRequiredIndicator : isRequired} isInvalid={isInvalid}>
                            {label}
                        </Label>}

                    <InputBase {...{
        ref,
        groupRef,
        size,
        placeholder,
        icon: Icon,
        shortcut,
        iconClassName,
        inputClassName,
        wrapperClassName,
        tooltipClassName,
        tooltip,
        type
      }} />

                    {hint && <HintText isInvalid={isInvalid}>{hint}</HintText>}
                </>}
        </TextField>;
});

Input.displayName = "Input";

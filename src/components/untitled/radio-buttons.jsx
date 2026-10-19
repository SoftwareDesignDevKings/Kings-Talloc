// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities and scoped reset.
"use client";
import "./styles/generated.css";
import { createContext, useContext } from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup, } from "react-aria-components";
import { cx } from "./utils/cx";
const RadioGroupContext = createContext(null);
export const RadioButtonBase = ({ className, isFocusVisible, isSelected, isDisabled, size = "sm" }) => {
    return (<div className={cx("uui:flex uui:size-4 uui:shrink-0 uui:cursor-pointer uui:appearance-none uui:items-center uui:justify-center uui:rounded-full uui:bg-primary uui:ring-1 uui:ring-primary uui:ring-inset", size === "md" && "uui:size-5", isSelected && "uui:bg-brand-solid uui:ring-brand-solid", isDisabled && "uui:cursor-not-allowed uui:opacity-50", isDisabled && !isSelected && "uui:bg-tertiary", isFocusVisible && "uui:outline-2 uui:outline-offset-2 uui:outline-focus-ring", className)}>
            <div className={cx("uui:size-1.5 uui:rounded-full uui:bg-fg-white uui:opacity-0 uui:transition-inherit-all", size === "md" && "uui:size-2", isSelected && "uui:opacity-100")}/>
        </div>);
};
RadioButtonBase.displayName = "RadioButtonBase";
export const RadioButton = ({ label, hint, className, size = "sm", ...ariaRadioProps }) => {
    const context = useContext(RadioGroupContext);
    size = context?.size ?? size;
    const sizes = {
        sm: {
            root: "uui:gap-2",
            textWrapper: "",
            label: "uui:text-sm uui:font-medium",
            hint: "uui:text-sm",
        },
        md: {
            root: "uui:gap-3",
            textWrapper: "uui:gap-0.5",
            label: "uui:text-md uui:font-medium",
            hint: "uui:text-md",
        },
    };
    return (<AriaRadio {...ariaRadioProps} className={(state) => cx("uui:relative uui:flex uui:items-start", state.isDisabled && "uui:cursor-not-allowed", sizes[size].root, typeof className === "function" ? className(state) : className)}>
            {({ isSelected, isDisabled, isFocusVisible }) => (<>
                    <RadioButtonBase size={size} isSelected={isSelected} isDisabled={isDisabled} isFocusVisible={isFocusVisible} className={label || hint ? "uui:mt-0.5" : ""}/>
                    {(label || hint) && (<div className={cx("uui:inline-flex uui:flex-col", sizes[size].textWrapper)}>
                            {label && <p className={cx("uui:text-secondary uui:select-none", sizes[size].label)}>{label}</p>}
                            {hint && (<span className={cx("uui:text-tertiary", sizes[size].hint)} onClick={(event) => event.stopPropagation()}>
                                    {hint}
                                </span>)}
                        </div>)}
                </>)}
        </AriaRadio>);
};
RadioButton.displayName = "RadioButton";
export const RadioGroup = ({ children, className, size = "sm", ...props }) => {
    return (<RadioGroupContext.Provider value={{ size }}>
            <AriaRadioGroup data-untitled-control {...props} className={cx("uui:flex uui:flex-col uui:gap-4", className)}>
                {children}
            </AriaRadioGroup>
        </RadioGroupContext.Provider>);
};

// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, scoped reset; select omits unused avatars/ComboBox.
"use client";
import "./styles/generated.css";

import { isValidElement, useContext } from "react";
import { Check } from "@untitledui/icons";
import { ListBoxItem as AriaListBoxItem, Text as AriaText } from "react-aria-components";
import { CheckboxBase } from "./checkbox";
import { cx } from "./utils/cx";
import { isReactComponent } from "./utils/is-react-component";
import { SelectContext } from "./select-shared";
const sizes = {
  sm: {
    root: "uui:p-2 uui:pr-2.5 uui:gap-2 uui:*:data-icon:size-4 uui:*:data-icon:stroke-[2.25px]",
    text: "uui:text-sm",
    textContainer: "uui:gap-x-1.5",
    check: "uui:size-4 uui:stroke-[2.25px]",
    checkbox: "sm"
  },
  md: {
    root: "uui:p-2 uui:pr-2.5 uui:gap-2 uui:*:data-icon:size-5",
    text: "uui:text-md",
    textContainer: "uui:gap-x-2",
    check: "uui:size-5",
    checkbox: "sm"
  },
  lg: {
    root: "uui:p-2.5 uui:pl-2 uui:gap-2 uui:*:data-icon:size-5",
    text: "uui:text-md",
    textContainer: "uui:gap-x-2",
    check: "uui:size-5",
    checkbox: "md"
  }
};
export const SelectItem = ({
  label,
  id,
  value,
  avatarUrl,
  supportingText,
  isDisabled,
  icon: Icon,
  className,
  children,
  selectionIndicator = "checkmark",
  selectionIndicatorAlign = "right",
  ...props
}) => {
  const {
    size
  } = useContext(SelectContext);
  const labelOrChildren = label || (typeof children === "string" ? children : "");
  const textValue = supportingText ? labelOrChildren + " " + supportingText : labelOrChildren;
  const isLeft = selectionIndicatorAlign === "left";
  return <AriaListBoxItem id={id} value={value ?? {
    id,
    label: labelOrChildren,
    avatarUrl,
    supportingText,
    isDisabled,
    icon: Icon
  }} textValue={textValue} isDisabled={isDisabled} {...props} className={state => cx("uui:w-full uui:py-px uui:outline-hidden", size === "sm" ? "uui:px-1" : "uui:px-1.5", typeof className === "function" ? className(state) : className)}>
            {state => <div className={cx("uui:flex uui:cursor-pointer uui:items-center uui:rounded-md uui:outline-hidden uui:select-none", (state.isFocused || state.isHovered || state.isSelected && selectionIndicator !== "checkbox") && "uui:bg-primary_hover", state.isDisabled && "uui:cursor-not-allowed uui:opacity-50", state.isFocusVisible && "uui:ring-2 uui:ring-focus-ring uui:ring-inset",
    // Icon styles
    "uui:*:data-icon:shrink-0 uui:*:data-icon:text-fg-quaternary", sizes[size].root)}>
                    {isLeft && selectionIndicator === "checkbox" && <CheckboxBase size={sizes[size].checkbox} isSelected={state.isSelected} isDisabled={state.isDisabled} />}

                    {isReactComponent(Icon) ? <Icon data-icon aria-hidden="true" /> : isValidElement(Icon) ? Icon : null}

                    <div className={cx("uui:flex uui:w-full uui:min-w-0 uui:flex-1 uui:flex-wrap", sizes[size].textContainer)}>
                        <AriaText slot="label" className={cx("uui:truncate uui:font-medium uui:whitespace-nowrap uui:text-primary", sizes[size].text)}>
                            {label || (typeof children === "function" ? children(state) : children)}
                        </AriaText>

                        {supportingText && <AriaText slot="description" className={cx("uui:whitespace-nowrap uui:text-tertiary", sizes[size].text)}>
                                {supportingText}
                            </AriaText>}
                    </div>

                    {state.isSelected && selectionIndicator === "checkmark" && <Check aria-hidden="true" className={cx("uui:ml-auto uui:text-fg-brand-primary", sizes[size].check)} />}

                    {!isLeft && selectionIndicator === "checkbox" && <CheckboxBase size={sizes[size].checkbox} isSelected={state.isSelected} isDisabled={state.isDisabled} className="uui:ml-auto" />}
                </div>}
        </AriaListBoxItem>;
};

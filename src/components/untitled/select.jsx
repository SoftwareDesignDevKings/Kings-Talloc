// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, scoped reset; select omits unused avatars/ComboBox.
"use client";
import "./styles/generated.css";

import { isValidElement } from "react";
import { ChevronDown } from "@untitledui/icons";
import { Button as AriaButton, ListBox as AriaListBox, Select as AriaSelect, SelectValue as AriaSelectValue } from "react-aria-components";
import { HintText } from "./hint-text";
import { Label } from "./label";
import { cx } from "./utils/cx";
import { isReactComponent } from "./utils/is-react-component";
import { Popover } from "./popover";
import { SelectItem } from "./select-item";
import { SelectContext, sizes } from "./select-shared";
export { SelectContext, sizes } from "./select-shared";
const SelectValue = ({
  isOpen,
  isFocused,
  isDisabled,
  size,
  placeholder,
  icon,
  ref
}) => {
  return <AriaButton ref={ref} className={cx("uui:relative uui:flex uui:w-full uui:cursor-pointer uui:items-center uui:rounded-lg uui:bg-primary uui:shadow-xs uui:ring-1 uui:ring-primary uui:outline-hidden uui:transition uui:duration-100 uui:ease-linear uui:ring-inset", (isFocused || isOpen) && "uui:ring-2 uui:ring-brand", isDisabled && "uui:cursor-not-allowed uui:opacity-50")}>
            <AriaSelectValue className={state => cx("uui:flex uui:h-max uui:w-full uui:items-center uui:justify-start uui:truncate uui:text-left uui:align-middle", sizes[size].root,
    // With icon
    (state.selectedItems[0]?.icon || icon) && sizes[size].withIcon,
    // Icon styles
    "uui:*:data-icon:shrink-0 uui:*:data-icon:text-fg-quaternary")}>
                {state => {
        const selectedItem = state.selectedItems[0];
        const Icon = selectedItem?.icon || icon;
        return <>
                            {isReactComponent(Icon) ? <Icon data-icon aria-hidden="true" /> : isValidElement(Icon) ? Icon : null}

                            {selectedItem ? <section className={cx("uui:flex uui:w-full uui:truncate", sizes[size].textContainer)}>
                                    <p className={cx("uui:truncate uui:font-medium uui:text-primary", sizes[size].text)}>{selectedItem?.label}</p>
                                    {selectedItem?.supportingText && <p className={cx("uui:text-tertiary", sizes[size].text)}>{selectedItem?.supportingText}</p>}
                                </section> : <p className={cx("uui:text-placeholder", sizes[size].text)}>{placeholder}</p>}

                            <ChevronDown aria-hidden="true" className={cx("uui:ml-auto uui:shrink-0 uui:text-fg-quaternary", size === "lg" ? "uui:size-5" : "uui:size-4 uui:stroke-[2.25px]")} />
                        </>;
      }}
            </AriaSelectValue>
        </AriaButton>;
};
const Select = ({
  placeholder = "Select",
  icon,
  size = "md",
  children,
  items,
  label,
  hint,
  tooltip,
  hideRequiredIndicator,
  className,
  portalContainer,
  ...rest
}) => {
  return <SelectContext.Provider value={{
    size
  }}>
            <AriaSelect data-untitled-control {...rest} className={state => cx("uui:flex uui:flex-col uui:gap-1.5", typeof className === "function" ? className(state) : className)}>
                {state => <>
                        {label && <Label isRequired={hideRequiredIndicator ? false : state.isRequired} tooltip={tooltip}>
                                {label}
                            </Label>}

                        <SelectValue {...state} {...{
          size,
          placeholder
        }} icon={icon} />

                        <Popover UNSAFE_portalContainer={portalContainer} size={size} className={rest.popoverClassName}>
                            <AriaListBox items={items} className="uui:size-full uui:outline-hidden">
                                {children}
                            </AriaListBox>
                        </Popover>

                        {hint && <HintText isInvalid={state.isInvalid} className={cx(size === "sm" && "uui:text-xs")}>
                                {hint}
                            </HintText>}
                    </>}
            </AriaSelect>
        </SelectContext.Provider>;
};
const _Select = Select;
_Select.Item = SelectItem;
export { _Select as Select };

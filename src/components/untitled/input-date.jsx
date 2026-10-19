// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities and scoped reset.
"use client";
import "./styles/generated.css";
import { HelpCircle, InfoCircle } from "@untitledui/icons";
import { DateInput as AriaDateInput, DateSegment as AriaDateSegment, Group as AriaGroup, } from "react-aria-components";
import { cx, sortCx } from "./utils/cx";
import { Tooltip, TooltipTrigger } from "./tooltip";
export const InputDateBase = ({ children, segmentObserver, tooltip, shortcut, groupRef, size = "md", isInvalid, isDisabled, icon: Icon, wrapperClassName, tooltipClassName, iconClassName, ...inputProps }) => {
    // Check if the input has a leading icon or tooltip
    const hasTrailingIcon = tooltip || isInvalid;
    const hasLeadingIcon = Icon;
    const inputSize = size;
    const sizes = sortCx({
        sm: {
            root: cx("uui:px-3 uui:py-2 uui:text-sm", hasTrailingIcon && "uui:pr-9", hasLeadingIcon && "uui:pl-8.5"),
            iconLeading: "uui:left-3 uui:size-4 uui:stroke-[2.25px]",
            iconTrailing: "uui:right-3",
            shortcut: "uui:pr-2.5",
        },
        md: {
            root: cx("uui:px-3 uui:py-2 uui:text-md", hasTrailingIcon && "uui:pr-9", hasLeadingIcon && "uui:pl-10"),
            iconLeading: "uui:left-3 uui:size-5",
            iconTrailing: "uui:right-3",
            shortcut: "uui:pr-2.5",
        },
        lg: {
            root: cx("uui:px-3.5 uui:py-2.5 uui:text-md", hasTrailingIcon && "uui:pr-9.5", hasLeadingIcon && "uui:pl-10.5"),
            iconLeading: "uui:left-3.5 uui:size-5",
            iconTrailing: "uui:right-3.5",
            shortcut: "uui:pr-3",
        },
    });
    return (<AriaGroup data-untitled-control {...{ isDisabled, isInvalid }} ref={groupRef} className={({ isFocusWithin, isDisabled, isInvalid }) => cx("uui:group/input uui:relative uui:flex uui:w-full uui:flex-row uui:place-content-center uui:place-items-center uui:rounded-lg uui:bg-primary uui:shadow-xs uui:ring-1 uui:ring-primary uui:transition-shadow uui:duration-100 uui:ease-linear uui:ring-inset", isFocusWithin && !isDisabled && "uui:ring-2 uui:ring-brand",
        // Disabled state styles
        isDisabled && "uui:cursor-not-allowed uui:opacity-50 uui:in-data-input-wrapper:opacity-100", "uui:group-disabled:cursor-not-allowed uui:group-disabled:opacity-50 uui:in-data-input-wrapper:group-disabled:opacity-100",
        // Invalid state styles
        isInvalid && "uui:ring-error_subtle", "uui:group-invalid:ring-error_subtle",
        // Invalid state with focus-within styles
        isInvalid && isFocusWithin && "uui:ring-2 uui:ring-error", isFocusWithin && "uui:group-invalid:ring-2 uui:group-invalid:ring-error", wrapperClassName)}>
            {/* Leading icon and Payment icon */}
            {Icon && (<Icon className={cx("uui:pointer-events-none uui:absolute uui:text-fg-quaternary", sizes[inputSize].iconLeading, iconClassName)}/>)}

            {/* Input field */}
            <AriaDateInput {...inputProps} className={cx("uui:flex uui:w-full", sizes[size].root, typeof inputProps.className === "string" && inputProps.className)}>
                {(segment) => (<><AriaDateSegment segment={segment} className={cx("uui:rounded uui:px-0.5 uui:text-primary uui:tabular-nums uui:caret-transparent uui:focus:bg-brand-solid uui:focus:font-medium uui:focus:text-white uui:focus:outline-hidden",
            // The placeholder segment.
            segment.isPlaceholder && "uui:text-placeholder uui:uppercase",
            // The separator "/" segment.
            segment.type === "literal" && "uui:text-fg-quaternary")}/>{segment.type === "day" && segmentObserver}</>)}
            </AriaDateInput>

            {/* Tooltip and help icon */}
            {tooltip && (<Tooltip title={tooltip} placement="top">
                    <TooltipTrigger className={cx("uui:absolute uui:cursor-pointer uui:text-fg-quaternary uui:transition uui:duration-200 uui:group-invalid/input:hidden uui:hover:text-fg-quaternary_hover uui:focus:text-fg-quaternary_hover", sizes[inputSize].iconTrailing, tooltipClassName)}>
                        <HelpCircle className="uui:size-4 uui:stroke-[2.25px]"/>
                    </TooltipTrigger>
                </Tooltip>)}

            {/* Invalid icon */}
            <InfoCircle className={cx("uui:pointer-events-none uui:absolute uui:hidden uui:size-4 uui:stroke-[2.25px] uui:text-fg-error-secondary uui:group-invalid/input:block", sizes[inputSize].iconTrailing, tooltipClassName)}/>

            {/* Shortcut */}
            {shortcut && (<div className={cx("uui:pointer-events-none uui:absolute uui:inset-y-0.5 uui:right-0.5 uui:z-10 uui:flex uui:items-center uui:rounded-r-[inherit] uui:bg-linear-to-r uui:from-transparent uui:to-bg-primary uui:to-40% uui:pl-8", sizes[inputSize].shortcut)}>
                    <span aria-hidden="true" className="uui:pointer-events-none uui:rounded uui:px-1 uui:py-px uui:text-xs uui:font-medium uui:text-quaternary uui:ring-1 uui:ring-secondary uui:select-none uui:ring-inset">
                        {typeof shortcut === "string" ? shortcut : "⌘K"}
                    </span>
                </div>)}
        {children}</AriaGroup>);
};

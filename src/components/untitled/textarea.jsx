// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities and scoped reset.
"use client";
import "./styles/generated.css";
import React, { forwardRef } from "react";
import { TextArea as AriaTextArea, TextField as AriaTextField } from "react-aria-components";
import { HintText } from "./hint-text";
import { Label } from "./label";
import { cx } from "./utils/cx";
// Creates a data URL for an SVG resize handle with a given color.
const getResizeHandleBg = (color) => {
    return `url(data:image/svg+xml;base64,${btoa(`<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L2 10" stroke="${color}" stroke-linecap="round"/><path d="M11 7L7 11" stroke="${color}" stroke-linecap="round"/></svg>`)})`;
};
export const TextAreaBase = forwardRef(({ className, size = "md", ...props }, ref) => {
    return (<AriaTextArea data-untitled-control {...props} ref={ref} style={{
            "--resize-handle-bg": getResizeHandleBg("#D5D7DA"),
            "--resize-handle-bg-dark": getResizeHandleBg("#373A41"),
        }} className={(state) => cx("uui:w-full uui:scroll-py-3 uui:rounded-lg uui:bg-primary uui:text-primary uui:shadow-xs uui:ring-1 uui:ring-primary uui:transition uui:duration-100 uui:ease-linear uui:ring-inset uui:placeholder:text-placeholder uui:autofill:rounded-lg uui:autofill:text-primary uui:focus:outline-hidden", size === "sm" && "uui:p-3 uui:text-sm", size === "md" && "uui:px-3.5 uui:py-3 uui:text-md",
        // Resize handle
        "uui:[&::-webkit-resizer]:bg-(image:--resize-handle-bg) uui:[&::-webkit-resizer]:bg-contain uui:dark:[&::-webkit-resizer]:bg-(image:--resize-handle-bg-dark)", state.isFocused && !state.isDisabled && "uui:ring-2 uui:ring-brand", state.isDisabled && "uui:cursor-not-allowed uui:opacity-50", state.isInvalid && "uui:ring-error_subtle", state.isInvalid && state.isFocused && "uui:ring-2 uui:ring-error", typeof className === "function" ? className(state) : className)}/>);
});
TextAreaBase.displayName = "TextAreaBase";
export const TextArea = ({ label, hint, tooltip, textAreaRef, hideRequiredIndicator, textAreaClassName, placeholder, className, rows, cols, size = "md", ...props }) => {
    return (<AriaTextField data-untitled-control {...props} className={(state) => cx("uui:group uui:flex uui:h-max uui:w-full uui:flex-col uui:items-start uui:justify-start uui:gap-1.5", typeof className === "function" ? className(state) : className)}>
            {({ isInvalid, isRequired }) => (<>
                    {label && (<Label isRequired={hideRequiredIndicator ? !hideRequiredIndicator : isRequired} tooltip={tooltip}>
                            {label}
                        </Label>)}

                    <TextAreaBase placeholder={placeholder} className={textAreaClassName} ref={textAreaRef} rows={rows} cols={cols} size={size}/>

                    {hint && (<HintText isInvalid={isInvalid} size={size}>
                            {hint}
                        </HintText>)}
                </>)}
        </AriaTextField>);
};
TextArea.displayName = "TextArea";

// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// Only types, import paths, utility prefixes, and the reset marker differ.
"use client";
import "./styles/generated.css";
import { isValidElement } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { cx, sortCx } from "./utils/cx";
import { isReactComponent } from "./utils/is-react-component";
export const styles = sortCx({
    common: {
        root: [
            "uui:group uui:relative uui:inline-flex uui:h-max uui:cursor-pointer uui:items-center uui:justify-center uui:whitespace-nowrap uui:outline-brand uui:transition uui:duration-100 uui:ease-linear uui:before:absolute uui:focus-visible:outline-2 uui:focus-visible:outline-offset-2",
            // When button is used within `InputGroup`
            "uui:in-data-input-wrapper:shadow-xs uui:in-data-input-wrapper:focus:!z-50 uui:in-data-input-wrapper:in-data-leading:-mr-px uui:in-data-input-wrapper:in-data-leading:rounded-r-none uui:in-data-input-wrapper:in-data-leading:before:rounded-r-none uui:in-data-input-wrapper:in-data-trailing:-ml-px uui:in-data-input-wrapper:in-data-trailing:rounded-l-none uui:in-data-input-wrapper:in-data-trailing:before:rounded-l-none",
            // Disabled styles
            "uui:disabled:cursor-not-allowed uui:disabled:opacity-50 uui:in-data-input-wrapper:disabled:opacity-100",
            // Same as `icon` but for SSR icons that cannot be passed to the client as functions.
            "uui:*:data-icon:pointer-events-none uui:*:data-icon:size-5 uui:*:data-icon:shrink-0 uui:*:data-icon:transition-inherit-all",
        ].join(" "),
        icon: "uui:pointer-events-none uui:size-5 uui:shrink-0 uui:transition-inherit-all",
    },
    sizes: {
        xs: {
            root: [
                "uui:gap-1 uui:rounded-lg uui:px-2.5 uui:py-1.5 uui:text-sm uui:font-semibold uui:before:rounded-[7px] uui:data-icon-only:p-2",
                "uui:in-data-input-wrapper:px-3.5 uui:in-data-input-wrapper:py-2.5 uui:in-data-input-wrapper:data-icon-only:p-2.5",
                "uui:*:data-icon:size-4 uui:*:data-icon:stroke-[2.25px]",
            ].join(" "),
            linkRoot: "uui:gap-1 uui:*:data-text:underline-offset-3",
        },
        sm: {
            root: [
                "uui:gap-1 uui:rounded-lg uui:px-3 uui:py-2 uui:text-sm uui:font-semibold uui:before:rounded-[7px] uui:data-icon-only:p-2",
                "uui:in-data-input-wrapper:px-3.5 uui:in-data-input-wrapper:py-2.5 uui:in-data-input-wrapper:data-icon-only:p-2.5",
            ].join(" "),
            linkRoot: "uui:gap-1 uui:*:data-text:underline-offset-3",
        },
        md: {
            root: [
                "uui:gap-1 uui:rounded-lg uui:px-3.5 uui:py-2.5 uui:text-sm uui:font-semibold uui:before:rounded-[7px] uui:data-icon-only:p-2.5",
                "uui:in-data-input-wrapper:gap-1.5 uui:in-data-input-wrapper:px-4 uui:in-data-input-wrapper:text-md uui:in-data-input-wrapper:data-icon-only:p-3",
            ].join(" "),
            linkRoot: "uui:gap-1 uui:*:data-text:underline-offset-4",
        },
        lg: {
            root: "uui:gap-1.5 uui:rounded-lg uui:px-4 uui:py-2.5 uui:text-md uui:font-semibold uui:before:rounded-[7px] uui:data-icon-only:p-3",
            linkRoot: "uui:gap-1.5 uui:*:data-text:underline-offset-4",
        },
        xl: {
            root: "uui:gap-1.5 uui:rounded-lg uui:px-4.5 uui:py-3 uui:text-md uui:font-semibold uui:before:rounded-[7px] uui:data-icon-only:p-3.5",
            linkRoot: "uui:gap-1.5 uui:*:data-text:underline-offset-4",
        },
    },
    colors: {
        primary: {
            root: [
                "uui:bg-brand-solid uui:text-white uui:shadow-xs-skeuomorphic uui:ring-1 uui:ring-transparent uui:ring-inset uui:hover:bg-brand-solid_hover uui:data-loading:bg-brand-solid_hover",
                // Inner border gradient
                "uui:before:absolute uui:before:inset-px uui:before:border uui:before:border-white/12 uui:before:mask-b-from-0%",
                // Icon styles
                "uui:*:data-icon:text-white/60 uui:hover:*:data-icon:text-white/70",
            ].join(" "),
        },
        secondary: {
            root: [
                "uui:bg-primary uui:text-secondary uui:shadow-xs-skeuomorphic uui:ring-1 uui:ring-primary uui:ring-inset uui:hover:bg-primary_hover uui:hover:text-secondary_hover uui:data-loading:bg-primary_hover",
                // Icon styles
                "uui:*:data-icon:text-fg-quaternary uui:hover:*:data-icon:text-fg-quaternary_hover",
            ].join(" "),
        },
        tertiary: {
            root: [
                "uui:text-tertiary uui:hover:bg-primary_hover uui:hover:text-tertiary_hover uui:data-loading:bg-primary_hover",
                // Icon styles
                "uui:*:data-icon:text-fg-quaternary uui:hover:*:data-icon:text-fg-quaternary_hover",
            ].join(" "),
        },
        "link-color": {
            root: [
                "uui:justify-normal uui:rounded uui:p-0! uui:text-brand-secondary uui:hover:text-brand-secondary_hover",
                // Inner text underline
                "uui:*:data-text:underline uui:*:data-text:decoration-transparent uui:hover:*:data-text:decoration-fg-brand-secondary_alt",
                // Icon styles
                "uui:*:data-icon:text-fg-brand-secondary_alt uui:hover:*:data-icon:text-fg-brand-secondary_hover",
            ].join(" "),
        },
        "link-gray": {
            root: [
                "uui:justify-normal uui:rounded uui:p-0! uui:text-tertiary uui:hover:text-tertiary_hover",
                // Inner text underline
                "uui:*:data-text:underline uui:*:data-text:decoration-transparent uui:hover:*:data-text:decoration-fg-quaternary",
                // Icon styles
                "uui:*:data-icon:text-fg-quaternary uui:hover:*:data-icon:text-fg-quaternary_hover",
            ].join(" "),
        },
        "primary-destructive": {
            root: [
                "uui:bg-error-solid uui:text-white uui:shadow-xs-skeuomorphic uui:ring-1 uui:ring-transparent uui:outline-error uui:ring-inset uui:hover:bg-error-solid_hover uui:data-loading:bg-error-solid_hover",
                // Inner border gradient
                "uui:before:absolute uui:before:inset-px uui:before:border uui:before:border-white/12 uui:before:mask-b-from-0%",
                // Icon styles
                "uui:*:data-icon:text-white/60 uui:hover:*:data-icon:text-white/70",
            ].join(" "),
        },
        "secondary-destructive": {
            root: [
                "uui:bg-primary uui:text-error-primary uui:shadow-xs-skeuomorphic uui:ring-1 uui:ring-error_subtle uui:outline-error uui:ring-inset uui:hover:bg-error-primary uui:hover:text-error-primary_hover uui:data-loading:bg-error-primary",
                // Icon styles
                "uui:*:data-icon:text-fg-error-secondary uui:hover:*:data-icon:text-fg-error-primary",
            ].join(" "),
        },
        "tertiary-destructive": {
            root: [
                "uui:text-error-primary uui:outline-error uui:hover:bg-error-primary uui:hover:text-error-primary_hover uui:data-loading:bg-error-primary",
                // Icon styles
                "uui:*:data-icon:text-fg-error-secondary uui:hover:*:data-icon:text-fg-error-primary",
            ].join(" "),
        },
        "link-destructive": {
            root: [
                "uui:justify-normal uui:rounded uui:p-0! uui:text-error-primary uui:outline-error uui:hover:text-error-primary_hover",
                // Inner text underline
                "uui:*:data-text:underline uui:*:data-text:decoration-transparent uui:*:data-text:underline-offset-2 uui:hover:*:data-text:decoration-current",
                // Icon styles
                "uui:*:data-icon:text-fg-error-secondary uui:hover:*:data-icon:text-fg-error-primary",
            ].join(" "),
        },
    },
});
export const Button = ({ size = "sm", color = "primary", children, className, noTextPadding, iconLeading: IconLeading, iconTrailing: IconTrailing, isDisabled: disabled, isLoading: loading, showTextWhileLoading, ...props }) => {
    const href = "href" in props ? props.href : undefined;
    const isIcon = (IconLeading || IconTrailing) && !children;
    const isLinkType = ["link-gray", "link-color", "link-destructive"].includes(color);
    noTextPadding = isLinkType || noTextPadding;
    const commonChildren = (<>
            {/* Leading icon */}
            {isValidElement(IconLeading) && IconLeading}
            {isReactComponent(IconLeading) && <IconLeading data-icon="leading" className={styles.common.icon}/>}

            {loading && (<svg fill="none" data-icon="loading" viewBox="0 0 20 20" className={cx(styles.common.icon, !showTextWhileLoading && "uui:absolute uui:top-1/2 uui:left-1/2 uui:-translate-x-1/2 uui:-translate-y-1/2")}>
                    {/* Background circle */}
                    <circle className="uui:stroke-current uui:opacity-30" cx="10" cy="10" r="8" fill="none" strokeWidth="2"/>
                    {/* Spinning circle */}
                    <circle className="uui:origin-center uui:animate-spin uui:stroke-current" cx="10" cy="10" r="8" fill="none" strokeWidth="2" strokeDasharray="12.5 50" strokeLinecap="round"/>
                </svg>)}

            {children && (<span data-text className={cx("uui:transition-inherit-all", !noTextPadding && "uui:px-0.5")}>
                    {children}
                </span>)}

            {/* Trailing icon */}
            {isValidElement(IconTrailing) && IconTrailing}
            {isReactComponent(IconTrailing) && <IconTrailing data-icon="trailing" className={styles.common.icon}/>}
        </>);
    const commonProps = {
        "data-untitled-button": "",
        "data-color": color,
        "data-loading": loading ? true : undefined,
        "data-icon-only": isIcon ? true : undefined,
        ...props,
        isDisabled: disabled,
        className: cx(styles.common.root, styles.sizes[size].root, styles.colors[color].root, isLinkType && styles.sizes[size].linkRoot, (loading || (href && (disabled || loading))) && "uui:pointer-events-none",
        // If in `loading` state, hide everything except the loading icon (and text if `showTextWhileLoading` is true).
        loading && (showTextWhileLoading ? "uui:[&>*:not([data-icon=loading]):not([data-text])]:hidden" : "uui:[&>*:not([data-icon=loading])]:invisible"), className),
        children: commonChildren,
    };
    if ("href" in commonProps) {
        return <AriaLink {...commonProps} href={disabled ? undefined : href}/>;
    }
    return <AriaButton {...commonProps} type={commonProps.type || "button"} isPending={loading}/>;
};

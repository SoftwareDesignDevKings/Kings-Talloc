// Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, scoped reset; render zero-count badges.
"use client";
import "./styles/generated.css";

import { createContext, isValidElement, useContext } from "react";
import { Tab as AriaTab, TabList as AriaTabList, TabPanel as AriaTabPanel, Tabs as AriaTabs, TabsContext, useSlottedContext } from "react-aria-components";
import { Badge } from "./badge";
import { cx } from "./utils/cx";
import { isReactComponent } from "./utils/is-react-component";

// Types for different orientations

// Styles for different types of tab
const getTabStyles = ({
  isFocusVisible,
  isSelected,
  isHovered
}) => ({
  "button-brand": cx("uui:outline-focus-ring uui:*:data-icon:text-fg-quaternary", isFocusVisible && "uui:outline-2 uui:-outline-offset-2", (isSelected || isHovered) && "uui:bg-brand-primary_alt uui:text-brand-secondary uui:*:data-icon:text-fg-brand-secondary_hover"),
  "button-gray": cx("uui:outline-focus-ring uui:*:data-icon:text-fg-quaternary", isHovered && "uui:bg-primary_hover uui:text-secondary uui:*:data-icon:text-fg-secondary_hover", isFocusVisible && "uui:outline-2 uui:-outline-offset-2", isSelected && "uui:bg-primary_hover uui:text-secondary uui:*:data-icon:text-fg-secondary_hover"),
  "button-border": cx("uui:outline-focus-ring uui:*:data-icon:text-fg-quaternary", isFocusVisible && "uui:outline-2 uui:-outline-offset-2", (isSelected || isHovered) && "uui:bg-primary_alt uui:text-secondary uui:shadow-sm uui:*:data-icon:text-fg-secondary_hover"),
  "button-minimal": cx("uui:rounded-lg uui:outline-focus-ring uui:*:data-icon:text-fg-quaternary", isFocusVisible && "uui:outline-2 uui:-outline-offset-2", (isSelected || isHovered) && "uui:bg-primary_alt uui:text-secondary uui:shadow-xs uui:ring-1 uui:ring-primary uui:ring-inset uui:*:data-icon:text-fg-secondary_hover"),
  underline: cx("uui:rounded-none uui:border-b-2 uui:border-transparent uui:outline-focus-ring uui:*:data-icon:text-fg-quaternary", isFocusVisible && "uui:outline-2 uui:-outline-offset-2", (isSelected || isHovered) && "uui:border-fg-brand-primary_alt uui:text-brand-secondary uui:*:data-icon:text-fg-brand-secondary_hover"),
  line: cx("uui:rounded-none uui:border-l-2 uui:border-transparent uui:outline-focus-ring uui:*:data-icon:text-fg-quaternary", isFocusVisible && "uui:outline-2 uui:-outline-offset-2", (isSelected || isHovered) && "uui:border-fg-brand-primary_alt uui:text-brand-secondary uui:*:data-icon:text-fg-brand-secondary_hover")
});
const sizes = {
  sm: {
    base: "uui:text-sm uui:font-semibold uui:gap-1 uui:*:data-icon:size-4",
    "button-brand": "uui:py-2 uui:px-2.5",
    "button-gray": "uui:py-2 uui:px-2.5",
    "button-border": "uui:py-2 uui:px-2.5",
    "button-minimal": "uui:py-2 uui:px-2.5",
    underline: "uui:px-0.5 uui:pb-2.5 uui:pt-0",
    line: "uui:pl-2.5 uui:pr-3 uui:py-0.5"
  },
  md: {
    base: "uui:text-md uui:font-semibold uui:gap-1.5 uui:*:data-icon:size-5",
    "button-brand": "uui:py-2.5 uui:px-2.5",
    "button-gray": "uui:py-2.5 uui:px-2.5",
    "button-border": "uui:py-2.5 uui:px-2.5",
    "button-minimal": "uui:py-2.5 uui:px-2.5",
    underline: "uui:px-0.5 uui:pb-2.5 uui:pt-0",
    line: "uui:pr-3.5 uui:pl-3 uui:py-1"
  }
};

// Styles for different types of horizontal tabs
const getHorizontalStyles = ({
  size,
  fullWidth
}) => ({
  "button-brand": "uui:gap-1",
  "button-gray": "uui:gap-1",
  "button-border": cx("uui:gap-1 uui:rounded-[10px] uui:bg-secondary_alt uui:p-1 uui:ring-1 uui:ring-secondary uui:ring-inset", size === "md" && "uui:rounded-xl uui:p-1.5"),
  "button-minimal": "uui:gap-0.5 uui:rounded-lg uui:bg-secondary_alt uui:ring-1 uui:ring-inset uui:ring-secondary",
  underline: cx("uui:gap-3", fullWidth && "uui:w-full uui:gap-4"),
  line: "uui:gap-2"
});
const TabListContext = createContext({
  size: "sm",
  type: "button-brand"
});
export const TabList = ({
  size = "sm",
  type = "button-brand",
  orientation: orientationProp,
  fullWidth,
  className,
  children,
  ...otherProps
}) => {
  const context = useSlottedContext(TabsContext);
  const orientation = orientationProp ?? context?.orientation ?? "horizontal";
  return <TabListContext.Provider value={{
    size,
    type,
    orientation,
    fullWidth
  }}>
            <AriaTabList {...otherProps} className={state => cx("uui:group uui:flex", getHorizontalStyles({
      size,
      fullWidth
    })[type], orientation === "vertical" && "uui:w-max uui:flex-col",
    // Only horizontal tabs with underline type have bottom border
    orientation === "horizontal" && type === "underline" && "uui:relative uui:before:absolute uui:before:inset-x-0 uui:before:bottom-0 uui:before:h-px uui:before:bg-border-secondary", typeof className === "function" ? className(state) : className)}>
                {children ?? (otherProps.items ? item => <Tab {...item}>{item.children}</Tab> : undefined)}
            </AriaTabList>
        </TabListContext.Provider>;
};
export const TabPanel = props => {
  return <AriaTabPanel {...props} className={state => cx("uui:outline-focus-ring uui:focus-visible:outline-2 uui:focus-visible:outline-offset-2", typeof props.className === "function" ? props.className(state) : props.className)} />;
};
export const Tab = ({
  label,
  children,
  badge,
  icon: Icon,
  className,
  ...otherProps
}) => {
  const {
    size = "sm",
    type = "button-brand",
    fullWidth
  } = useContext(TabListContext);
  const showPillColorBadge = type === "underline" || type === "line" || type === "button-brand";
  return <AriaTab {...otherProps} className={prop => cx("uui:z-10 uui:flex uui:h-max uui:cursor-pointer uui:items-center uui:justify-center uui:gap-2 uui:rounded-md uui:whitespace-nowrap uui:text-quaternary uui:transition uui:duration-100 uui:ease-linear", "uui:group-orientation-vertical:justify-start", fullWidth && "uui:w-full uui:flex-1", sizes[size].base, sizes[size][type], getTabStyles(prop)[type], typeof className === "function" ? className(prop) : className)}>
            {state => <>
                    {/* Icon */}
                    {isValidElement(Icon) && Icon}
                    {isReactComponent(Icon) && <Icon data-icon className="uui:transition-inherit-all" />}

                    <span className={cx("uui:flex uui:items-center uui:gap-1.5", type !== "line" && "uui:px-0.5")}>
                        {typeof children === "function" ? children(state) : children || label}

                        {/* Badge */}
                        {badge != null && <Badge size="sm" type={showPillColorBadge ? "pill-color" : "modern"} color={showPillColorBadge && (state.isHovered || state.isSelected) ? "brand" : "gray"} className={cx("uui:hidden uui:transition-inherit-all uui:md:flex", size === "sm" && "uui:-my-px")}>
                                {badge}
                            </Badge>}
                    </span>
                </>}
        </AriaTab>;
};
export const Tabs = ({
  className,
  ...props
}) => {
  return <AriaTabs data-untitled-control keyboardActivation="manual" {...props} className={state => cx("uui:flex uui:w-full uui:flex-col", typeof className === "function" ? className(state) : className)} />;
};
Tabs.Panel = TabPanel;
Tabs.List = TabList;
Tabs.Item = Tab;

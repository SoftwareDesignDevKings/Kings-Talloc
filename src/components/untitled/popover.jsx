// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, and scoped reset adaptations.
"use client";
import "./styles/generated.css";

import { Popover as AriaPopover } from "react-aria-components";
import { cx } from "./utils/cx";
export const Popover = props => {
  return <AriaPopover data-untitled-control data-untitled-select-popover placement="bottom" containerPadding={0} offset={4} {...props} className={state => cx("uui:w-(--trigger-width) uui:origin-(--trigger-anchor-point) uui:overflow-x-hidden uui:overflow-y-auto uui:rounded-lg uui:bg-primary uui:py-1 uui:shadow-lg uui:ring-1 uui:ring-secondary_alt uui:outline-hidden uui:will-change-transform", state.isEntering && "uui:duration-150 uui:ease-out uui:animate-in uui:fade-in uui:placement-right:slide-in-from-left-0.5 uui:placement-top:slide-in-from-bottom-0.5 uui:placement-bottom:slide-in-from-top-0.5", state.isExiting && "uui:duration-100 uui:ease-in uui:animate-out uui:fade-out uui:placement-right:slide-out-to-left-0.5 uui:placement-top:slide-out-to-bottom-0.5 uui:placement-bottom:slide-out-to-top-0.5", props.size === "sm" && "uui:max-h-56!", props.size === "md" && "uui:max-h-64!", props.size === "lg" && "uui:max-h-80!", typeof props.className === "function" ? props.className(state) : props.className)} />;
};

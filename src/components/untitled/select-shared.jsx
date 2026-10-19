// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, and scoped reset adaptations.
"use client";

import { createContext } from "react";
export const sizes = {
  sm: {
    root: "uui:py-2 uui:pl-3 uui:pr-2.5 uui:gap-2 uui:*:data-icon:size-4 uui:*:data-icon:stroke-[2.25px]",
    withIcon: "",
    text: "uui:text-sm",
    textContainer: "uui:gap-x-1.5",
    shortcut: "uui:pr-2.5"
  },
  md: {
    root: "uui:py-2 uui:px-3 uui:gap-2 uui:*:data-icon:size-5",
    withIcon: "",
    text: "uui:text-md",
    textContainer: "uui:gap-x-1.5",
    shortcut: "uui:pr-2.5"
  },
  lg: {
    root: "uui:py-2.5 uui:px-3.5 uui:gap-2 uui:*:data-icon:size-5",
    withIcon: "",
    text: "uui:text-md",
    textContainer: "uui:gap-x-1.5",
    shortcut: "uui:pr-3"
  }
};
export const SelectContext = createContext({
  size: "md"
});

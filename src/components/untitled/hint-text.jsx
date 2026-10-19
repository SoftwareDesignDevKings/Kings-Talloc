// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, scoped reset, and React 18 input refs.
"use client";

import { Text as AriaText } from "react-aria-components";
import { cx } from "./utils/cx";
export const HintText = ({
  isInvalid,
  className,
  size = "md",
  ...props
}) => {
  return <AriaText {...props} slot={isInvalid ? "errorMessage" : "description"} className={cx("uui:text-sm uui:text-tertiary",
  // Size
  size === "sm" && "uui:text-xs", "uui:in-data-[input-size=sm]:text-xs",
  // Invalid state
  isInvalid && "uui:text-error-primary", "uui:group-invalid:text-error-primary", className)} />;
};
HintText.displayName = "HintText";

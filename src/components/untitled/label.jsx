// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, and omission of explicitly hidden required indicators.
"use client";

import { HelpCircle } from "@untitledui/icons";
import { Label as AriaLabel } from "react-aria-components";
import { Tooltip, TooltipTrigger } from "./tooltip";
import { cx } from "./utils/cx";
export const Label = ({
  isInvalid,
  isRequired,
  tooltip,
  tooltipDescription,
  className,
  ...props
}) => {
  return <AriaLabel
  // Used for conditionally hiding/showing the label element via CSS:
  // <Input label="Visible only on mobile" className="lg:**:data-label:hidden" />
  // or
  // <Input label="Visible only on mobile" className="lg:label:hidden" />
  data-label="true" {...props} className={cx("uui:flex uui:cursor-default uui:items-center uui:gap-0.5 uui:text-sm uui:font-medium uui:text-secondary", className)}>
            {props.children}

            {isRequired !== false && <span aria-hidden="true" className={cx("uui:hidden uui:text-brand-tertiary", isRequired && "uui:block", typeof isRequired === "undefined" && "uui:group-required:block", isInvalid && "uui:text-error-primary", typeof isInvalid === "undefined" && "uui:group-invalid:text-error-primary")}>
                *
            </span>}

            {tooltip && <Tooltip title={tooltip} description={tooltipDescription} placement="top">
                    <TooltipTrigger
      // `TooltipTrigger` inherits the disabled state from the parent form field
      // but we don't that. We want the tooltip be enabled even if the parent
      // field is disabled.
      isDisabled={false} className="uui:cursor-pointer uui:text-fg-quaternary uui:transition uui:duration-200 uui:hover:text-fg-quaternary_hover uui:focus:text-fg-quaternary_hover">
                        <HelpCircle className="uui:size-4" />
                    </TooltipTrigger>
                </Tooltip>}
        </AriaLabel>;
};
Label.displayName = "Label";

// Adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, and scoped reset.
"use client";
import "./styles/generated.css";
import { isValidElement } from "react";
import { cx, sortCx } from "./utils/cx";
import { isReactComponent } from "./utils/is-react-component";
const iconsSizes = {
  sm: "uui:*:data-icon:size-4 uui:*:data-icon:stroke-[2.25px]",
  md: "uui:*:data-icon:size-5",
  lg: "uui:*:data-icon:size-6",
  xl: "uui:*:data-icon:size-7"
};
const styles = sortCx({
  light: {
    base: "uui:rounded-full",
    sizes: {
      sm: "uui:size-8",
      md: "uui:size-10",
      lg: "uui:size-12",
      xl: "uui:size-14"
    },
    colors: {
      brand: "uui:bg-brand-secondary uui:text-featured-icon-light-fg-brand",
      gray: "uui:bg-tertiary uui:text-featured-icon-light-fg-gray",
      error: "uui:bg-error-secondary uui:text-featured-icon-light-fg-error",
      warning: "uui:bg-warning-secondary uui:text-featured-icon-light-fg-warning",
      success: "uui:bg-success-secondary uui:text-featured-icon-light-fg-success"
    }
  },
  gradient: {
    base: "uui:rounded-full uui:text-fg-white uui:before:absolute uui:before:inset-0 uui:before:size-full uui:before:rounded-full uui:before:border uui:before:mask-b-from-0% uui:after:absolute uui:after:block uui:after:rounded-full",
    sizes: {
      sm: "uui:size-8 uui:after:size-6 uui:*:data-icon:size-4",
      md: "uui:size-10 uui:after:size-7 uui:*:data-icon:size-4",
      lg: "uui:size-12 uui:after:size-8 uui:*:data-icon:size-5",
      xl: "uui:size-14 uui:after:size-10 uui:*:data-icon:size-5"
    },
    colors: {
      brand: "uui:before:border-utility-brand-200 uui:before:bg-utility-brand-50 uui:after:bg-brand-solid",
      gray: "uui:before:border-utility-neutral-200 uui:before:bg-utility-neutral-50 uui:after:bg-secondary-solid",
      error: "uui:before:border-utility-red-200 uui:before:bg-utility-red-50 uui:after:bg-error-solid",
      warning: "uui:before:border-utility-yellow-200 uui:before:bg-utility-yellow-50 uui:after:bg-warning-solid",
      success: "uui:before:border-utility-green-200 uui:before:bg-utility-green-50 uui:after:bg-success-solid"
    }
  },
  dark: {
    base: "uui:text-fg-white uui:shadow-xs-skeuomorphic uui:before:absolute uui:before:inset-px uui:before:border uui:before:border-white/12 uui:before:mask-b-from-0%",
    sizes: {
      sm: "uui:size-8 uui:rounded-md uui:before:rounded-[5px]",
      md: "uui:size-10 uui:rounded-lg uui:before:rounded-[7px]",
      lg: "uui:size-12 uui:rounded-[10px] uui:before:rounded-[9px]",
      xl: "uui:size-14 uui:rounded-xl uui:before:rounded-[11px]"
    },
    colors: {
      brand: "uui:bg-brand-solid uui:before:border-utility-brand-200/12",
      gray: "uui:bg-secondary-solid uui:before:border-utility-neutral-200/12",
      error: "uui:bg-error-solid uui:before:border-utility-red-200/12",
      warning: "uui:bg-warning-solid uui:before:border-utility-yellow-200/12",
      success: "uui:bg-success-solid uui:before:border-utility-green-200/12"
    }
  },
  modern: {
    base: "uui:bg-primary uui:shadow-xs-skeuomorphic uui:ring-1 uui:ring-primary uui:ring-inset",
    sizes: {
      sm: "uui:size-8 uui:rounded-md",
      md: "uui:size-10 uui:rounded-lg",
      lg: "uui:size-12 uui:rounded-[10px]",
      xl: "uui:size-14 uui:rounded-xl"
    },
    colors: {
      brand: "uui:text-fg-brand-primary",
      gray: "uui:text-fg-secondary",
      error: "uui:text-fg-error-primary",
      warning: "uui:text-fg-warning-primary",
      success: "uui:text-fg-success-primary"
    }
  },
  "modern-neue": {
    base: ["uui:bg-primary_alt uui:ring-1 uui:ring-inset uui:before:absolute uui:before:inset-1",
    // Shadow
    "uui:before:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1),0px_3px_3px_0px_rgba(0,0,0,0.09),1px_8px_5px_0px_rgba(0,0,0,0.05),2px_21px_6px_0px_rgba(0,0,0,0),0px_0px_0px_1px_rgba(0,0,0,0.08),1px_13px_5px_0px_rgba(0,0,0,0.01),0px_-2px_2px_0px_rgba(0,0,0,0.13)_inset] uui:before:ring-1 uui:before:ring-secondary_alt"].join(""),
    sizes: {
      sm: "uui:size-8 uui:rounded-[8px] uui:before:rounded-[4px]",
      md: "uui:size-10 uui:rounded-[10px] uui:before:rounded-[6px]",
      lg: "uui:size-12 uui:rounded-[12px] uui:before:rounded-[8px]",
      xl: "uui:size-14 uui:rounded-[14px] uui:before:rounded-[10px]"
    },
    colors: {
      brand: "",
      gray: "uui:text-fg-secondary uui:ring-primary",
      error: "",
      warning: "",
      success: ""
    }
  },
  outline: {
    base: "uui:before:absolute uui:before:rounded-full uui:before:border-2 uui:after:absolute uui:after:rounded-full uui:after:border-2",
    sizes: {
      sm: "uui:size-4 uui:before:size-6 uui:after:size-8.5",
      md: "uui:size-5 uui:before:size-7 uui:after:size-9.5",
      lg: "uui:size-6 uui:before:size-8 uui:after:size-10.5",
      xl: "uui:size-7 uui:before:size-9 uui:after:size-11.5"
    },
    colors: {
      brand: "uui:text-fg-brand-primary uui:before:border-fg-brand-primary/30 uui:after:border-fg-brand-primary/10",
      gray: "uui:text-fg-tertiary uui:before:border-fg-tertiary/30 uui:after:border-fg-tertiary/10",
      error: "uui:text-fg-error-primary uui:before:border-fg-error-primary/30 uui:after:border-fg-error-primary/10",
      warning: "uui:text-fg-warning-primary uui:before:border-fg-warning-primary/30 uui:after:border-fg-warning-primary/10",
      success: "uui:text-fg-success-primary uui:before:border-fg-success-primary/30 uui:after:border-fg-success-primary/10"
    }
  }
});
export const FeaturedIcon = props => {
  const {
    size = "sm",
    theme: variant = "light",
    color = "brand",
    icon: Icon,
    ...otherProps
  } = props;
  return <div {...otherProps} data-featured-icon className={cx("uui:relative uui:flex uui:shrink-0 uui:items-center uui:justify-center", iconsSizes[size], styles[variant].base, styles[variant].sizes[size], styles[variant].colors[color], props.className)}>
            {isReactComponent(Icon) && <Icon data-icon className="uui:z-1" />}
            {isValidElement(Icon) && <div className="uui:z-1">{Icon}</div>}

            {props.children}
        </div>;
};

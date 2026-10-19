// Badge-only excerpt from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, utility prefixes, and scoped reset marker.
"use client";
import "./styles/generated.css";
import { cx } from "./utils/cx";
const badgeTypes = {
  pillColor: "pill-color",
  badgeColor: "color",
  badgeModern: "modern"
};
export const filledColors = {
  gray: {
    root: "uui:bg-utility-neutral-50 uui:text-utility-neutral-700 uui:ring-utility-neutral-200",
    addon: "uui:text-utility-neutral-500",
    addonButton: "uui:hover:bg-utility-neutral-100 uui:text-utility-neutral-400 uui:hover:text-utility-neutral-500"
  },
  brand: {
    root: "uui:bg-utility-brand-50 uui:text-utility-brand-700 uui:ring-utility-brand-200",
    addon: "uui:text-utility-brand-500",
    addonButton: "uui:hover:bg-utility-brand-100 uui:text-utility-brand-400 uui:hover:text-utility-brand-500"
  },
  error: {
    root: "uui:bg-utility-red-50 uui:text-utility-red-700 uui:ring-utility-red-200",
    addon: "uui:text-utility-red-500",
    addonButton: "uui:hover:bg-utility-red-100 uui:text-utility-red-400 uui:hover:text-utility-red-500"
  },
  warning: {
    root: "uui:bg-utility-yellow-50 uui:text-utility-yellow-700 uui:ring-utility-yellow-200",
    addon: "uui:text-utility-yellow-500",
    addonButton: "uui:hover:bg-utility-yellow-100 uui:text-utility-yellow-400 uui:hover:text-utility-yellow-500"
  },
  success: {
    root: "uui:bg-utility-green-50 uui:text-utility-green-700 uui:ring-utility-green-200",
    addon: "uui:text-utility-green-500",
    addonButton: "uui:hover:bg-utility-green-100 uui:text-utility-green-400 uui:hover:text-utility-green-500"
  },
  slate: {
    root: "uui:bg-utility-slate-50 uui:text-utility-slate-700 uui:ring-utility-slate-200",
    addon: "uui:text-utility-slate-500",
    addonButton: "uui:hover:bg-utility-slate-100 uui:text-utility-slate-400 uui:hover:text-utility-slate-500"
  },
  sky: {
    root: "uui:bg-utility-sky-50 uui:text-utility-sky-700 uui:ring-utility-sky-200",
    addon: "uui:text-utility-sky-500",
    addonButton: "uui:hover:bg-utility-sky-100 uui:text-utility-sky-400 uui:hover:text-utility-sky-500"
  },
  blue: {
    root: "uui:bg-utility-blue-50 uui:text-utility-blue-700 uui:ring-utility-blue-200",
    addon: "uui:text-utility-blue-500",
    addonButton: "uui:hover:bg-utility-blue-100 uui:text-utility-blue-400 uui:hover:text-utility-blue-500"
  },
  indigo: {
    root: "uui:bg-utility-indigo-50 uui:text-utility-indigo-700 uui:ring-utility-indigo-200",
    addon: "uui:text-utility-indigo-500",
    addonButton: "uui:hover:bg-utility-indigo-100 uui:text-utility-indigo-400 uui:hover:text-utility-indigo-500"
  },
  purple: {
    root: "uui:bg-utility-purple-50 uui:text-utility-purple-700 uui:ring-utility-purple-200",
    addon: "uui:text-utility-purple-500",
    addonButton: "uui:hover:bg-utility-purple-100 uui:text-utility-purple-400 uui:hover:text-utility-purple-500"
  },
  pink: {
    root: "uui:bg-utility-pink-50 uui:text-utility-pink-700 uui:ring-utility-pink-200",
    addon: "uui:text-utility-pink-500",
    addonButton: "uui:hover:bg-utility-pink-100 uui:text-utility-pink-400 uui:hover:text-utility-pink-500"
  },
  orange: {
    root: "uui:bg-utility-orange-50 uui:text-utility-orange-700 uui:ring-utility-orange-200",
    addon: "uui:text-utility-orange-500",
    addonButton: "uui:hover:bg-utility-orange-100 uui:text-utility-orange-400 uui:hover:text-utility-orange-500"
  }
};
const withPillTypes = {
  [badgeTypes.pillColor]: {
    common: "uui:size-max uui:flex uui:items-center uui:whitespace-nowrap uui:rounded-full uui:ring-1 uui:ring-inset",
    styles: filledColors
  },
  [badgeTypes.badgeColor]: {
    common: "uui:size-max uui:flex uui:items-center uui:whitespace-nowrap uui:rounded-md uui:ring-1 uui:ring-inset",
    styles: filledColors
  },
  [badgeTypes.badgeModern]: {
    common: "uui:size-max uui:flex uui:items-center uui:whitespace-nowrap uui:rounded-md uui:ring-1 uui:ring-inset uui:shadow-xs",
    styles: {
      gray: {
        root: "uui:bg-primary uui:text-secondary uui:ring-primary",
        addon: "uui:text-neutral-500",
        addonButton: "uui:hover:bg-utility-neutral-100 uui:text-utility-neutral-400 uui:hover:text-utility-neutral-500"
      }
    }
  }
};
export const Badge = props => {
  const {
    type = "pill-color",
    size = "md",
    color = "gray",
    children
  } = props;
  const colors = withPillTypes[type];
  const pillSizes = {
    sm: "uui:py-0.5 uui:px-2 uui:text-xs uui:font-medium",
    md: "uui:py-0.5 uui:px-2.5 uui:text-sm uui:font-medium",
    lg: "uui:py-1 uui:px-3 uui:text-sm uui:font-medium"
  };
  const badgeSizes = {
    sm: "uui:py-0.5 uui:px-1.5 uui:text-xs uui:font-medium",
    md: "uui:py-0.5 uui:px-2 uui:text-sm uui:font-medium",
    lg: "uui:py-1 uui:px-2.5 uui:text-sm uui:font-medium uui:rounded-lg"
  };
  const sizes = {
    [badgeTypes.pillColor]: pillSizes,
    [badgeTypes.badgeColor]: badgeSizes,
    [badgeTypes.badgeModern]: badgeSizes
  };
  return <span data-untitled-badge className={cx(colors.common, sizes[type][size], colors.styles[color].root, props.className)}>{children}</span>;
};

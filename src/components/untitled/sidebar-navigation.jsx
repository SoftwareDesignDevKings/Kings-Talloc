// Excerpts from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// SidebarNavigationSimple frame and NavItemBase link variant. JSX, local imports,
// prefixed utilities, Next.js Link routing, and the existing collapsed layout.
"use client";
import "./styles/generated.css";
import Link from "next/link";
import { cx } from "./utils/cx";

export const SidebarNavigation = ({ children, className, ...props }) => (
    <aside
        {...props}
        data-untitled-sidebar
        className={cx("uui:flex uui:h-full uui:max-w-full uui:flex-col uui:justify-between uui:overflow-y-auto uui:border-r uui:border-secondary uui:bg-primary", className)}
    >
        {children}
    </aside>
);

export const NavItemBase = ({ icon: Icon, current, collapsed = false, children, className, ...props }) => (
    <Link
        {...props}
        data-untitled-nav-item
        aria-current={current ? "page" : undefined}
        className={cx(
            "uui:group/item uui:relative uui:flex uui:max-h-9 uui:w-full uui:cursor-pointer uui:items-center uui:rounded-md uui:bg-primary uui:p-2 uui:outline-focus-ring uui:transition uui:duration-100 uui:ease-linear uui:select-none uui:hover:bg-primary_hover uui:focus-visible:z-10 uui:focus-visible:outline-2 uui:focus-visible:outline-offset-2",
            current && "uui:bg-secondary uui:hover:bg-secondary_hover",
            collapsed && "uui:justify-center",
            className,
        )}
    >
        {Icon && <Icon aria-hidden="true" className={cx(
            "uui:size-5 uui:shrink-0 uui:text-fg-quaternary uui:transition-inherit-all uui:group-hover/item:text-fg-quaternary_hover",
            !collapsed && "uui:mr-2",
            current && "uui:text-fg-quaternary_hover",
        )} />}
        <span className={cx(
            "uui:flex-1 uui:truncate uui:text-sm uui:font-semibold uui:text-secondary uui:transition-inherit-all uui:group-hover/item:text-secondary_hover",
            current && "uui:text-secondary_hover",
            collapsed && "uui:sr-only",
        )}>{children}</span>
    </Link>
);

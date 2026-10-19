// TableCard.Root excerpt from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// JSX, local imports, prefixed utilities, and an in-layout border so the outline
// remains visible inside the application's clipped scroll containers.
"use client";
import "./styles/generated.css";
import { createContext } from "react";
import { cx } from "./utils/cx";

const TableContext = createContext({
  size: "md"
});
const TableCardRoot = ({
  children,
  className,
  size = "md",
  ...props
}) => {
  return <TableContext.Provider value={{
    size
  }}>
            <div data-untitled-table-card data-untitled-card {...props} className={cx("uui:overflow-hidden uui:rounded-xl uui:border uui:border-secondary uui:bg-primary uui:shadow-xs", className)}>
                {children}
            </div>
        </TableContext.Provider>;
};
export const TableCard = { Root: TableCardRoot };

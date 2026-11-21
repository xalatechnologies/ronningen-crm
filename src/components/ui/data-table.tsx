"use client";

import type { KeyboardEvent, ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_TABLE_HEAD_CELL } from "@/lib/table-typography";
import { cn } from "@/lib/utils";

export type ColumnAlign = "left" | "center" | "right";

export type DataTableColumn<T> = {
  id: string;
  /** Column title. Use `srOnlyHeader` for columns that only hold buttons. */
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: ColumnAlign;
  /** Extra classes for the cells of this column. */
  className?: string;
  /** Extra classes for the header cell. */
  headClassName?: string;
  /** Visually hides the header text but keeps it for screen readers. */
  srOnlyHeader?: boolean;
  /** Clicks inside this column (for example edit and delete buttons) do not trigger `onRowClick`. */
  stopRowClick?: boolean;
};

const ALIGN: Record<ColumnAlign, string> = {
  left: "",
  center: "text-center",
  right: "text-right",
};

/**
 * Shared table for list pages: header, rows with hover and keyboard activation, and an optional
 * phone layout. Cell content, data and handlers stay in the page; this only owns the scaffolding.
 *
 * With `renderMobileItem` the table is hidden below `md` and each row is drawn as a list item instead.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  rowClassName,
  renderMobileItem,
  mobileListClassName,
  rowActionLabel,
}: {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  renderMobileItem?: (row: T) => ReactNode;
  mobileListClassName?: string;
  /** Accessible name for a clickable row. */
  rowActionLabel?: (row: T) => string;
}) {
  const clickable = onRowClick != null;
  // A row that already holds its own buttons (edit, delete) is not a second tab stop:
  // those buttons are the keyboard path, and nested focusable controls confuse screen readers.
  const rowFocusable = clickable && !columns.some((c) => c.stopRowClick);

  function onKey(e: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!rowFocusable || e.target !== e.currentTarget) return;
    if (e.key === "Enter") onRowClick(row);
  }

  return (
    <>
      <div className={cn(renderMobileItem && "hidden md:block")}>
        <Table>
          <TableHeader>
            <TableRow className="border-0 bg-muted/50 hover:bg-muted/50">
              {columns.map((c) => (
                <TableHead
                  key={c.id}
                  className={cn(
                    APP_TABLE_HEAD_CELL,
                    c.align && ALIGN[c.align],
                    c.headClassName,
                  )}
                >
                  {c.srOnlyHeader ? <span className="sr-only">{c.header}</span> : c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={getRowKey(row)}
                tabIndex={rowFocusable ? 0 : undefined}
                aria-label={rowFocusable ? rowActionLabel?.(row) : undefined}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={rowFocusable ? (e) => onKey(e, row) : undefined}
                className={cn(
                  "group border-foreground/6 hover:bg-muted/50",
                  clickable && "cursor-pointer",
                  rowFocusable &&
                    "outline-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-inset",
                  rowClassName?.(row),
                )}
              >
                {columns.map((c) => (
                  <TableCell
                    key={c.id}
                    className={cn(
                      "px-4 py-3.5 align-middle sm:px-6",
                      c.align && ALIGN[c.align],
                      c.className,
                    )}
                    onClick={c.stopRowClick ? (e) => e.stopPropagation() : undefined}
                  >
                    {c.cell(row, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {renderMobileItem ? (
        <ul className={cn("divide-y divide-foreground/8 md:hidden", mobileListClassName)}>
          {rows.map((row) => (
            <li key={getRowKey(row)}>{renderMobileItem(row)}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

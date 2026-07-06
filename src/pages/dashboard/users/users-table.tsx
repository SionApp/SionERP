import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { User } from '@/types/user.types';
import { flexRender, Table as TableType } from '@tanstack/react-table';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 2) return [1, 2, 3];
  if (current >= total - 1) return [total - 2, total - 1, total];
  return [current - 1, current, current + 1];
}

interface UsersTableProps {
  table: TableType<User>;
  loading?: boolean;
  // server-side pagination
  serverPage: number;
  serverTotal: number;
  serverLimit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function UsersTable({
  table,
  loading,
  serverPage,
  serverTotal,
  serverLimit,
  onPageChange,
  onLimitChange,
}: UsersTableProps) {
  const pageCount = Math.max(Math.ceil(serverTotal / serverLimit), 1);
  const pageNumbers = getPageNumbers(serverPage, pageCount);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id}>
              {hg.headers.map(header => (
                <TableHead key={header.id} className="py-3 font-medium text-muted-foreground">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: serverLimit }).map((_, i) => (
              <TableRow key={i}>
                {table.getVisibleLeafColumns().map(col => (
                  <TableCell key={col.id}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className="border-border/60 hover:bg-muted/40"
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-24 text-center text-muted-foreground"
              >
                No se encontraron usuarios.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Separator />

      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Filas por página</span>
            <Select
              value={`${serverLimit}`}
              onValueChange={v => {
                onLimitChange(Number(v));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {PAGE_SIZE_OPTIONS.map(s => (
                    <SelectItem key={s} value={`${s}`}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <span className="tabular-nums">
            Pág. {serverPage} de {pageCount}
          </span>
        </div>

        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={e => {
                  e.preventDefault();
                  onPageChange(serverPage - 1);
                }}
                className={serverPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>

            {pageNumbers[0] > 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {pageNumbers.map(n => (
              <PaginationItem key={n}>
                <PaginationLink
                  href="#"
                  isActive={n === serverPage}
                  onClick={e => {
                    e.preventDefault();
                    onPageChange(n);
                  }}
                >
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}

            {pageNumbers[pageNumbers.length - 1] < pageCount && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={e => {
                  e.preventDefault();
                  onPageChange(serverPage + 1);
                }}
                className={serverPage >= pageCount ? 'pointer-events-none opacity-50' : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

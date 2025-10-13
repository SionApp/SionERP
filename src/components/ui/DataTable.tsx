import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  responsive?: 'always' | 'sm' | 'md' | 'lg' | 'xl' | 'never';
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: boolean;
  itemsPerPage?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  mobileCardRender?: (item: T, actions?: React.ReactNode) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions,
  loading = false,
  emptyMessage = 'No se encontraron datos',
  pagination = true,
  itemsPerPage = 10,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  className,
  mobileCardRender,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(item =>
      columns.some(column => {
        const value = item[column.key];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage, pagination]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (columnKey: keyof T) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getResponsiveClass = (responsive: Column<T>['responsive']) => {
    switch (responsive) {
      case 'always':
        return 'block';
      case 'sm':
        return 'hidden sm:table-cell';
      case 'md':
        return 'hidden md:table-cell';
      case 'lg':
        return 'hidden lg:table-cell';
      case 'xl':
        return 'hidden xl:table-cell';
      case 'never':
        return 'hidden';
      default:
        return 'hidden md:table-cell';
    }
  };

  const getResponsiveCardClass = (responsive: Column<T>['responsive']) => {
    switch (responsive) {
      case 'always':
        return 'block';
      case 'sm':
        return 'block sm:hidden';
      case 'md':
        return 'block md:hidden';
      case 'lg':
        return 'block lg:hidden';
      case 'xl':
        return 'block xl:hidden';
      case 'never':
        return 'hidden';
      default:
        return 'block md:hidden';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      {searchable && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-medium text-muted-foreground',
                    column.sortable && 'cursor-pointer hover:text-foreground',
                    column.className,
                    getResponsiveClass(column.responsive)
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && <ArrowUpDown className="h-4 w-4 opacity-50" />}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                  {columns.map(column => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-sm',
                        column.className,
                        getResponsiveClass(column.responsive)
                      )}
                    >
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3">{actions(item)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
        ) : (
          paginatedData.map((item, index) => (
            <div key={index}>
              {mobileCardRender ? (
                mobileCardRender(item, actions?.(item))
              ) : (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="space-y-2">
                    {columns.map(column => (
                      <div
                        key={String(column.key)}
                        className={cn(
                          'flex justify-between items-start',
                          getResponsiveCardClass(column.responsive)
                        )}
                      >
                        <span className="text-sm font-medium text-muted-foreground">
                          {column.label}:
                        </span>
                        <span className="text-sm text-right">
                          {column.render ? column.render(item) : item[column.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {actions && (
                    <div className="flex justify-end mt-4 pt-4 border-t">{actions(item)}</div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
            {Math.min(currentPage * itemsPerPage, sortedData.length)} de {sortedData.length}{' '}
            resultados
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

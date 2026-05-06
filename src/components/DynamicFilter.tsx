import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type FilterFieldType = 'text' | 'select' | 'date' | 'dateRange' | 'boolean';

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface FilterValues {
  [key: string]: any;
}

interface DynamicFilterProps {
  fields: FilterField[];
  onFilterChange: (filters: FilterValues) => void;
  onClear?: () => void;
}

export const DynamicFilter = ({ fields, onFilterChange, onClear }: DynamicFilterProps) => {
  const [filters, setFilters] = useState<FilterValues>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    setFilters({});
    onFilterChange({});
    if (onClear) onClear();
  };

  const renderField = (field: FilterField) => {
    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id={field.key}
                placeholder={field.placeholder || `Buscar por ${field.label.toLowerCase()}...`}
                value={filters[field.key] || ''}
                onChange={(e) => handleFilterChange(field.key, e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Select
              value={filters[field.key] || ''}
              onValueChange={(value) => handleFilterChange(field.key, value)}
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder={field.placeholder || `Seleccionar ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={field.key}
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters[field.key] && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters[field.key] ? format(filters[field.key], 'PPP') : field.placeholder || 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters[field.key]}
                  onSelect={(date) => handleFilterChange(field.key, date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'dateRange':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={field.key}
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters[field.key]?.from && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters[field.key]?.from ? (
                    filters[field.key]?.to ? (
                      <>
                        {format(filters[field.key].from, 'LLL dd, y')} -{' '}
                        {format(filters[field.key].to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(filters[field.key].from, 'LLL dd, y')
                    )
                  ) : (
                    field.placeholder || 'Seleccionar rango'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={filters[field.key]}
                  onSelect={(range) => handleFilterChange(field.key, range)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className="flex items-center space-x-2 pt-8">
            <Checkbox
              id={field.key}
              checked={filters[field.key] || false}
              onCheckedChange={(checked) => handleFilterChange(field.key, checked)}
            />
            <Label htmlFor={field.key} className="cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== undefined && v !== false).length;

  return (
    <Card>
      <CardHeader className="cursor-pointer py-3 sm:py-4" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-300',
                isExpanded && 'rotate-180'
              )}
            />
            Filtros
            {activeFilterCount > 0 && (
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                ({activeFilterCount} activo{activeFilterCount > 1 ? 's' : ''})
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="h-8 text-xs sm:text-sm"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {fields.map(renderField)}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

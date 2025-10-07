// Package utils contiene funciones y utilidades útiles para el backend.
package database

import (
	"fmt"
	"reflect"
	"strings"
)

// BuildUpdateQuery construye dinámicamente una query UPDATE
// basándose en los campos no-nil del struct
func BuildUpdateQuery(data interface{}, tableName, idColumn, idValue string) (string, []interface{}, error) {
	updates := []string{}
	args := []interface{}{}
	argPos := 1

	// Obtener el valor y tipo del struct
	val := reflect.ValueOf(data)

	// Si es un puntero, obtener el valor que apunta
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	// Verificar que sea un struct
	if val.Kind() != reflect.Struct {
		return "", nil, fmt.Errorf("expected struct, got %s", val.Kind())
	}

	typ := val.Type()

	// Iterar sobre todos los campos del struct
	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		fieldType := typ.Field(i)

		// Obtener el tag json (nombre de la columna)
		jsonTag := fieldType.Tag.Get("json")
		if jsonTag == "" || jsonTag == "-" {
			continue // Skip si no tiene tag json
		}

		// Limpiar el tag (quitar ,omitempty)
		columnName := strings.Split(jsonTag, ",")[0]

		// Verificar si el campo es un puntero y no es nil
		if field.Kind() == reflect.Ptr && !field.IsNil() {
			// Obtener el valor real del puntero
			actualValue := field.Elem().Interface()

			updates = append(updates, fmt.Sprintf("%s = $%d", columnName, argPos))
			args = append(args, actualValue)
			argPos++
		} else if field.Kind() != reflect.Ptr {
			// Campo no es puntero (valor directo)
			updates = append(updates, fmt.Sprintf("%s = $%d", columnName, argPos))
			args = append(args, field.Interface())
			argPos++
		}
		// Si es puntero nil, lo ignoramos (no actualizar ese campo)
	}

	// Verificar que hay algo que actualizar
	if len(updates) == 0 {
		return "", nil, fmt.Errorf("no fields to update")
	}

	// Siempre agregar updated_at
	updates = append(updates, "updated_at = NOW()")

	// Construir query
	query := fmt.Sprintf(
		"UPDATE %s SET %s WHERE %s = $%d",
		tableName,
		strings.Join(updates, ", "),
		idColumn,
		argPos,
	)
	args = append(args, idValue)

	return query, args, nil
}

// Package database Package utils contiene funciones y utilidades útiles para el backend.
package database

import (
	"fmt"
	"reflect"
	"strings"
)

func BuildUpdateQuery(data interface{}, tableName, idColumn, idValue string) (string, []interface{}, error) {
	var updates []string
	var args []interface{}
	argPos := 1

	val := reflect.ValueOf(data)

	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	if val.Kind() != reflect.Struct {
		return "", nil, fmt.Errorf("expected struct, got %s", val.Kind())
	}

	typ := val.Type()

	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		fieldType := typ.Field(i)

		jsonTag := fieldType.Tag.Get("json")
		if jsonTag == "" || jsonTag == "-" {
			continue
		}

		// Prefer db tag over json tag for column name
		dbTag := fieldType.Tag.Get("db")
		var columnName string
		if dbTag != "" && dbTag != "-" {
			columnName = strings.Split(dbTag, ",")[0]
		} else {
			columnName = strings.Split(jsonTag, ",")[0]
		}

		if field.Kind() == reflect.Ptr && !field.IsNil() {
			actualValue := field.Elem().Interface()

			updates = append(updates, fmt.Sprintf("%s = $%d", columnName, argPos))
			args = append(args, actualValue)
			argPos++
		} else if field.Kind() != reflect.Ptr {
			updates = append(updates, fmt.Sprintf("%s = $%d", columnName, argPos))
			args = append(args, field.Interface())
			argPos++
		}
	}

	if len(updates) == 0 {
		return "", nil, fmt.Errorf("no fields to update")
	}

	updates = append(updates, "updated_at = NOW()")

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

// BuildUpdateQueryFromMap construye una query UPDATE desde un map[string]interface{}
func BuildUpdateQueryFromMap(data map[string]interface{}, tableName, idColumn, idValue string) (string, []interface{}, error) {
	var updates []string
	var args []interface{}
	argPos := 1

	for key, value := range data {
		// Skip nil values and the id column
		if value == nil || key == idColumn || key == "id" {
			continue
		}

		updates = append(updates, fmt.Sprintf("%s = $%d", key, argPos))
		args = append(args, value)
		argPos++
	}

	if len(updates) == 0 {
		return "", nil, fmt.Errorf("no fields to update")
	}

	updates = append(updates, "updated_at = NOW()")

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

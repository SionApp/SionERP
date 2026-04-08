package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

type Zone struct {
	ID            string           `json:"id"`
	Name          string           `json:"name"`
	Description   sql.NullString   `json:"description"`
	Color         string           `json:"color"`
	SupervisorID  sql.NullString   `json:"supervisor_id"`
	Boundaries    *json.RawMessage `json:"boundaries"`
	CenterLat     sql.NullFloat64  `json:"center_lat"`
	CenterLng     sql.NullFloat64  `json:"center_lng"`
	IsActive      bool             `json:"is_active"`
	TotalGroups   int              `json:"total_groups"`
	TotalMembers  int              `json:"total_members"`
	AvgAttendance float64          `json:"avg_attendance"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

type ZoneWithDetails struct {
	Zone
	SupervisorName string `json:"supervisor_name,omitempty"`
}

type CreateZoneRequest struct {
	Name         string          `json:"name" validate:"required"`
	Description  string          `json:"description,omitempty"`
	Color        string          `json:"color,omitempty"`
	SupervisorID string          `json:"supervisor_id,omitempty"`
	Boundaries   json.RawMessage `json:"boundaries,omitempty"`
	CenterLat    *float64        `json:"center_lat,omitempty"`
	CenterLng    *float64        `json:"center_lng,omitempty"`
}

type UpdateZoneRequest struct {
	Name         *string          `json:"name,omitempty"`
	Description  *string          `json:"description,omitempty"`
	Color        *string          `json:"color,omitempty"`
	SupervisorID *string          `json:"supervisor_id,omitempty"`
	Boundaries   *json.RawMessage `json:"boundaries,omitempty"`
	CenterLat    *float64         `json:"center_lat,omitempty"`
	CenterLng    *float64         `json:"center_lng,omitempty"`
	IsActive     *bool            `json:"is_active,omitempty"`
}

type ZoneStats struct {
	ZoneName        string  `json:"zone_name"`
	ZoneID          string  `json:"zone_id"`
	TotalGroups     int     `json:"total_groups"`
	TotalMembers    int     `json:"total_members"`
	AvgAttendance   float64 `json:"avg_attendance"`
	GrowthRate      float64 `json:"growth_rate"`
	ActiveLeaders   int     `json:"active_leaders"`
	Multiplications int     `json:"multiplications"`
}

type ZoneMapGroup struct {
	ID              string          `json:"id"`
	GroupName       string          `json:"group_name"`
	LeaderID        string          `json:"leader_id"`
	SupervisorID    sql.NullString  `json:"supervisor_id"`
	ZoneID          sql.NullString  `json:"zone_id"`
	ZoneName        sql.NullString  `json:"zone_name"`
	MeetingDay      sql.NullString  `json:"meeting_day"`
	MeetingTime     sql.NullString  `json:"meeting_time"`
	MeetingLocation sql.NullString  `json:"meeting_location"`
	MeetingAddress  sql.NullString  `json:"meeting_address"`
	Latitude        sql.NullFloat64 `json:"latitude"`
	Longitude       sql.NullFloat64 `json:"longitude"`
	MemberCount     int             `json:"member_count"`
	ActiveMembers   int             `json:"active_members"`
	Status          string          `json:"status"`
	LeaderName      string          `json:"leader_name"`
	SupervisorName  string          `json:"supervisor_name.omitempty"`
}

type ZoneMapData struct {
	Zone   ZoneWithDetails `json:"zone"`
	Groups []ZoneMapGroup  `json:"groups"`
}

type ZoneMapResponse struct {
	Zones []ZoneMapData `json:"zones"`
}

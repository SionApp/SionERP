package main

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

// Row-count knobs. Kept modest so seeding stays fast and the resulting DB size
// is representative of a mid-size church, not a stress-test in itself — the
// load comes from concurrent k6 traffic, not from the seed volume.
const (
	zonesPerTenant       = 3
	groupSize            = 8 // ~1 discipleship group per 8 users
	musicEventsPerTenant = 12
	musicSongsPerTenant  = 15
)

// discipleshipLevelSeed mirrors handlers/onboarding.go's ProvisionChurch so
// synthetic tenants get the same 5 standard levels a real church gets.
type discipleshipLevelSeed struct {
	name        string
	description string
	icon        string
	color       string
	orderIndex  int
}

var standardDiscipleshipLevels = []discipleshipLevelSeed{
	{"Pastoral", "Nivel Pastoral", "crown", "#8b5cf6", 1},
	{"Coordinador General", "Coordinador General", "shield", "#06b6d4", 2},
	{"Coordinador", "Coordinador de zona", "shield", "#10b981", 3},
	{"Supervisor Auxiliar", "Supervisor Auxiliar", "users", "#f59e0b", 4},
	{"Líder", "Líder de célula", "user", "#6b7280", 5},
}

// SessionCredential is a load-test tenant's session/login user — the k6
// scenario authenticates as this user once per tenant (see tools/loadtest/README.md).
type SessionCredential struct {
	Email    string
	ChurchID string
}

// SeedSummary reports what SeedTenants created, for the CLI summary output.
type SeedSummary struct {
	Tenants            int
	Users              int
	Zones              int
	Groups             int
	GroupMembers       int
	MusicMembers       int
	MusicEvents        int
	MusicSongs         int
	MusicAssignments   int
	SessionCredentials []SessionCredential
}

// SeedTenants creates tenantCount synthetic churches, each with usersPerTenant
// users, zones, discipleship groups/members, and music module data.
//
// Only ONE user per tenant (index 0, role "pastor") is created through the
// real Supabase Auth Admin API — that's the only user k6 needs to log in as.
// The rest are inserted directly (bulk realistic data, never logged into).
// See generate.go RoleForUserIndex doc comment for why role=pastor.
func SeedTenants(db *sql.DB, tenantCount, usersPerTenant int, password string) (*SeedSummary, error) {
	summary := &SeedSummary{}

	for t := 1; t <= tenantCount; t++ {
		churchID := uuid.New().String()

		if err := seedChurch(db, churchID, t); err != nil {
			return summary, fmt.Errorf("tenant %d: %w", t, err)
		}
		summary.Tenants++

		zoneIDs, err := seedZones(db, churchID, t)
		if err != nil {
			return summary, fmt.Errorf("tenant %d: zones: %w", t, err)
		}
		summary.Zones += len(zoneIDs)

		if err := seedDiscipleshipLevels(db, churchID); err != nil {
			return summary, fmt.Errorf("tenant %d: discipleship levels: %w", t, err)
		}

		sessionEmail := UserEmail(t, 0)
		sessionUserID, err := createAuthSessionUser(sessionEmail, password, t, churchID)
		if err != nil {
			return summary, fmt.Errorf("tenant %d: session user via Supabase Auth: %w", t, err)
		}
		// The handle_new_user trigger already inserted a public.users row for
		// sessionUserID (church_id/role came from user_metadata — see
		// createAuthSessionUser). Just fix up the FK-dependent fields the
		// trigger can't know about yet (zone_id).
		if err := assignUserZone(db, sessionUserID, zoneIDs[0]); err != nil {
			return summary, fmt.Errorf("tenant %d: session user zone: %w", t, err)
		}

		userIDs := []string{sessionUserID}
		for u := 1; u < usersPerTenant; u++ {
			userID := uuid.New().String()
			role := RoleForUserIndex(u)
			zoneID := zoneIDs[u%len(zoneIDs)]
			if err := insertBulkUser(db, userID, churchID, zoneID, t, u, role); err != nil {
				return summary, fmt.Errorf("tenant %d: user %d: %w", t, u, err)
			}
			userIDs = append(userIDs, userID)
		}
		summary.Users += len(userIDs)

		groups, members, err := seedDiscipleshipGroups(db, churchID, t, userIDs, zoneIDs)
		if err != nil {
			return summary, fmt.Errorf("tenant %d: discipleship groups: %w", t, err)
		}
		summary.Groups += groups
		summary.GroupMembers += members

		musicMembers, events, songs, assignments, err := seedMusic(db, churchID, t, userIDs)
		if err != nil {
			return summary, fmt.Errorf("tenant %d: music: %w", t, err)
		}
		summary.MusicMembers += musicMembers
		summary.MusicEvents += events
		summary.MusicSongs += songs
		summary.MusicAssignments += assignments

		summary.SessionCredentials = append(summary.SessionCredentials, SessionCredential{
			Email:    sessionEmail,
			ChurchID: churchID,
		})
	}

	return summary, nil
}

func seedChurch(db *sql.DB, churchID string, tenantIdx int) error {
	name := TenantName(tenantIdx)
	slug := TenantSlug(tenantIdx)

	if _, err := db.Exec(
		`INSERT INTO public.churches (id, name, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, NOW(), NOW())`,
		churchID, name, slug,
	); err != nil {
		return fmt.Errorf("insert church: %w", err)
	}

	// Module registry — install every module this baseline exercises so
	// middleware.RequireModule gates don't block the k6 navigation mix.
	for _, key := range []string{"base", "discipleship", "zones", "events", "reports", "music"} {
		if _, err := db.Exec(
			`INSERT INTO public.modules (key, name, description, is_installed, installed_at, church_id)
			 VALUES ($1, $1, 'Load test module', true, NOW(), $2)
			 ON CONFLICT (church_id, key) DO NOTHING`,
			key, churchID,
		); err != nil {
			return fmt.Errorf("insert module %s: %w", key, err)
		}
	}

	if _, err := db.Exec(
		`INSERT INTO public.church_info (id, church_id, name, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())`,
		churchID, name,
	); err != nil {
		return fmt.Errorf("insert church_info: %w", err)
	}

	return nil
}

func seedDiscipleshipLevels(db *sql.DB, churchID string) error {
	for _, l := range standardDiscipleshipLevels {
		if _, err := db.Exec(
			`INSERT INTO public.discipleship_levels
			   (id, name, description, icon, color, order_index, is_active, church_id, created_at, updated_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())`,
			l.name, l.description, l.icon, l.color, l.orderIndex, churchID,
		); err != nil {
			return fmt.Errorf("insert discipleship_level %s: %w", l.name, err)
		}
	}
	return nil
}

func seedZones(db *sql.DB, churchID string, tenantIdx int) ([]string, error) {
	zoneIDs := make([]string, 0, zonesPerTenant)
	for z := 1; z <= zonesPerTenant; z++ {
		zoneID := uuid.New().String()
		if _, err := db.Exec(
			`INSERT INTO public.zones (id, name, description, color, is_active, church_id, created_at, updated_at)
			 VALUES ($1, $2, 'Zona sintética de load test', '#3b82f6', true, $3, NOW(), NOW())`,
			zoneID, ZoneName(tenantIdx, z), churchID,
		); err != nil {
			return nil, fmt.Errorf("insert zone %d: %w", z, err)
		}
		zoneIDs = append(zoneIDs, zoneID)
	}
	return zoneIDs, nil
}

func assignUserZone(db *sql.DB, userID, zoneID string) error {
	_, err := db.Exec(`UPDATE public.users SET zone_id = $1 WHERE id = $2`, zoneID, userID)
	return err
}

// insertBulkUser inserts a synthetic user directly (no Supabase Auth account —
// this user is never logged into, it only exists as realistic FK data).
func insertBulkUser(db *sql.DB, userID, churchID, zoneID string, tenantIdx, userIdx int, role string) error {
	_, err := db.Exec(
		`INSERT INTO public.users
		   (id, id_number, first_name, last_name, phone, address, email,
		    role, is_active, church_id, zone_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, NOW(), NOW())`,
		userID,
		UserIDNumber(tenantIdx, userIdx),
		fmt.Sprintf("LoadTest%d", userIdx),
		fmt.Sprintf("Tenant%d", tenantIdx),
		"+00-000-000-0000",
		"N/A (synthetic load test user)",
		UserEmail(tenantIdx, userIdx),
		role,
		churchID,
		zoneID,
	)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func seedDiscipleshipGroups(db *sql.DB, churchID string, tenantIdx int, userIDs, zoneIDs []string) (groups, members int, err error) {
	groupCount := len(userIDs) / groupSize
	if groupCount < 1 {
		groupCount = 1
	}

	for g := 1; g <= groupCount; g++ {
		groupID := uuid.New().String()
		leaderID := userIDs[(g*groupSize)%len(userIDs)]
		zoneID := zoneIDs[g%len(zoneIDs)]

		if _, err := db.Exec(
			`INSERT INTO public.discipleship_groups
			   (id, group_name, leader_id, meeting_location, meeting_day, status, zone_id, church_id, created_at, updated_at)
			 VALUES ($1, $2, $3, 'Casa del líder', 'Viernes', 'active', $4, $5, NOW(), NOW())`,
			groupID, GroupName(tenantIdx, g), leaderID, zoneID, churchID,
		); err != nil {
			return groups, members, fmt.Errorf("insert group %d: %w", g, err)
		}
		groups++

		// Assign the next groupSize users (wrapping) as members of this group.
		start := (g - 1) * groupSize
		for i := 0; i < groupSize && start+i < len(userIDs); i++ {
			userID := userIDs[start+i]
			roleInGroup := "member"
			if userID == leaderID {
				roleInGroup = "leader"
			}
			if _, err := db.Exec(
				`INSERT INTO public.discipleship_group_members
				   (id, group_id, user_id, role_in_group, is_active, church_id, joined_at, created_at, updated_at)
				 VALUES (gen_random_uuid(), $1, $2, $3, true, $4, NOW(), NOW(), NOW())
				 ON CONFLICT (group_id, user_id) DO NOTHING`,
				groupID, userID, roleInGroup, churchID,
			); err != nil {
				return groups, members, fmt.Errorf("insert group member: %w", err)
			}
			members++
		}
	}

	return groups, members, nil
}

func seedMusic(db *sql.DB, churchID string, tenantIdx int, userIDs []string) (musicMembers, events, songs, assignments int, err error) {
	funciones := []string{"corista", "musico", "tecnico", "danzarina"}

	// music_members: a subset of the tenant's users (every 4th user).
	memberIDs := make([]string, 0)
	for i, userID := range userIDs {
		if i%4 != 0 {
			continue
		}
		musicMemberID := uuid.New().String()
		funcion := funciones[i%len(funciones)]
		if _, err := db.Exec(
			`INSERT INTO public.music_members (id, user_id, funciones, is_active, church_id, created_at, updated_at)
			 VALUES ($1, $2, ARRAY[$3]::text[], true, $4, NOW(), NOW())`,
			musicMemberID, userID, funcion, churchID,
		); err != nil {
			return musicMembers, events, songs, assignments, fmt.Errorf("insert music_member: %w", err)
		}
		memberIDs = append(memberIDs, musicMemberID)
		musicMembers++
	}
	if len(memberIDs) == 0 {
		return musicMembers, events, songs, assignments, nil
	}

	// music_songs.
	songIDs := make([]string, 0, musicSongsPerTenant)
	for s := 1; s <= musicSongsPerTenant; s++ {
		songID := uuid.New().String()
		name := fmt.Sprintf("LOADTEST Song %03d-%02d", tenantIdx, s)
		if _, err := db.Exec(
			`INSERT INTO public.music_songs (id, name, name_normalized, author, default_key, church_id, created_at)
			 VALUES ($1, $2, LOWER($2), 'LOADTEST', 'C', $3, NOW())`,
			songID, name, churchID,
		); err != nil {
			return musicMembers, events, songs, assignments, fmt.Errorf("insert music_song %d: %w", s, err)
		}
		songIDs = append(songIDs, songID)
		songs++
	}

	// music_events + assignments.
	eventTypes := []string{"viernes", "domingo", "especial"}
	for e := 1; e <= musicEventsPerTenant; e++ {
		eventID := uuid.New().String()
		eventType := eventTypes[e%len(eventTypes)]
		if _, err := db.Exec(
			`INSERT INTO public.music_events (id, event_date, event_type, title, published, church_id, created_at, updated_at)
			 VALUES ($1, CURRENT_DATE + ($2 || ' days')::interval, $3, $4, true, $5, NOW(), NOW())`,
			eventID, e, eventType, fmt.Sprintf("LOADTEST Culto %03d-%02d", tenantIdx, e), churchID,
		); err != nil {
			return musicMembers, events, songs, assignments, fmt.Errorf("insert music_event %d: %w", e, err)
		}
		events++

		// Assign 3 members per event (wrapping through memberIDs).
		for a := 0; a < 3 && a < len(memberIDs); a++ {
			memberID := memberIDs[(e+a)%len(memberIDs)]
			funcion := funciones[(e+a)%len(funciones)]
			if _, err := db.Exec(
				`INSERT INTO public.music_assignments (id, event_id, member_id, funcion, state, church_id, created_at, updated_at)
				 VALUES (gen_random_uuid(), $1, $2, $3, 'confirmado', $4, NOW(), NOW())
				 ON CONFLICT (event_id, member_id) DO NOTHING`,
				eventID, memberID, funcion, churchID,
			); err != nil {
				return musicMembers, events, songs, assignments, fmt.Errorf("insert music_assignment: %w", err)
			}
			assignments++
		}
	}

	return musicMembers, events, songs, assignments, nil
}

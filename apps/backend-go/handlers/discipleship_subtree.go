package handlers

import (
	"backend-sion/config"
	"fmt"
)

// discipleship_subtree.go — Hierarchy subtree resolution for multi-supervisor zones.
//
// A zone can hold MULTIPLE General Supervisors (level 3), each owning their own
// Auxiliaries (level 2) and Leaders (level 1). Scoping a General's data by
// `zone_id` leaks a sibling General's subtree. These helpers resolve "who is under
// supervisor X" by traversing discipleship_hierarchy.supervisor_id instead.
//
// Two flavours:
//   - subtreeUserIDs: runtime resolution returning a []string of user-ids.
//   - *Subquery: SQL-fragment composers, embedded inline as `... IN (<subquery>)`
//     to avoid a round-trip when the scope is part of a larger query.
//
// All variants are church-scoped: every query carries church_id, so a supervisor
// UUID that happens to collide across tenants never leaks rows.

// subtreeUserIDs returns the user-ids exactly `hops` levels below supervisorID in
// the supervision tree, scoped to churchID. hops=1 → direct children (a General's
// auxiliaries); hops=2 → grandchildren (a General's leaders). Returns an empty
// slice (never nil) when there are no matches.
func subtreeUserIDs(q config.Querier, churchID, supervisorID string, hops int) ([]string, error) {
	if hops < 1 {
		return []string{}, nil
	}
	rows, err := q.Query(`
		WITH RECURSIVE sub AS (
			SELECT user_id, 1 AS depth
			FROM discipleship_hierarchy
			WHERE church_id = $1 AND supervisor_id = $2
			UNION ALL
			SELECT h.user_id, sub.depth + 1
			FROM discipleship_hierarchy h
			JOIN sub ON h.supervisor_id = sub.user_id
			WHERE h.church_id = $1 AND sub.depth < $3
		)
		SELECT DISTINCT user_id FROM sub WHERE depth = $3
	`, churchID, supervisorID, hops)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// subtreeAuxIDsSubquery emits a subquery (no trailing semicolon) selecting the
// AUXILIARY supervisors (level 2) directly under the supervisor bound at $supPos,
// scoped to the church bound at $churchPos. 1 hop.
func subtreeAuxIDsSubquery(churchPos, supPos int) string {
	return fmt.Sprintf(
		`SELECT a.user_id FROM discipleship_hierarchy a `+
			`WHERE a.church_id = $%d AND a.hierarchy_level = 2 AND a.supervisor_id = $%d`,
		churchPos, supPos,
	)
}

// subtreeLeaderIDsSubquery emits a subquery selecting the LEADERS (level 1) two
// hops under the supervisor bound at $supPos (general → auxiliaries → leaders),
// scoped to the church bound at $churchPos.
func subtreeLeaderIDsSubquery(churchPos, supPos int) string {
	return fmt.Sprintf(
		`SELECT l.user_id FROM discipleship_hierarchy l `+
			`WHERE l.church_id = $%d AND l.hierarchy_level = 1 AND l.supervisor_id IN (%s)`,
		churchPos, subtreeAuxIDsSubquery(churchPos, supPos),
	)
}

// directLeaderIDsSubquery emits a subquery selecting the LEADERS (level 1) directly
// under the supervisor bound at $supPos (used by an Auxiliary whose leaders are one
// hop away), scoped to the church bound at $churchPos.
func directLeaderIDsSubquery(churchPos, supPos int) string {
	return fmt.Sprintf(
		`SELECT d.user_id FROM discipleship_hierarchy d `+
			`WHERE d.church_id = $%d AND d.hierarchy_level = 1 AND d.supervisor_id = $%d`,
		churchPos, supPos,
	)
}

#!/usr/bin/env bash
# Scenario tests for supabase/schema.sql against the mock Supabase schemas.
# Usage: DATABASE_URL=postgres://... supabase/tests/rls_test.sh  (a throwaway database with mock_supabase.sql + schema.sql loaded)
P="psql ${DATABASE_URL:?set DATABASE_URL} -qtA"
PLANNER=11111111-1111-1111-1111-111111111111
G1=22222222-2222-2222-2222-222222222222
G2=33333333-3333-3333-3333-333333333333
OUT=44444444-4444-4444-4444-444444444444
$P -c "insert into auth.users values ('$PLANNER'),('$G1'),('$G2'),('$OUT') on conflict do nothing"
pass=0; fail=0
as() { # as <uid> <anon true|false> <sql>
  $P -c "set role authenticated; set request.jwt.claims = '{\"sub\":\"$1\",\"is_anonymous\":$2}'; $3" 2>&1 | tr "\n" " " | sed "s/ *$//"
}
expect() { # expect <name> <expected substring> <actual>
  if { [[ -z "$2" ]] && [[ -z "$3" ]]; } || { [[ -n "$2" ]] && [[ "$3" == *"$2"* ]]; }; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1 :: expected '$2' got '$3'"; fi
}

expect "anon guest cannot create events" "row-level security" \
  "$(as $G1 true "insert into events (owner_id,name,starts_at,reveal_at) values ('$G1','x',now(),now()+interval '1h')")"
expect "planner gets free plan" "free" "$(as $PLANNER false "select ensure_planner()")"
expect "anon cannot become planner" "NOT_A_PLANNER" "$(as $G1 true "select ensure_planner()")"
EV=$(as $PLANNER false "insert into events (owner_id,name,starts_at,reveal_at,shots_per_guest,max_guests) values ('$PLANNER','Wedding',now()-interval '1h',now()+interval '1h',2,999) returning id")
expect "event created" "-" "$EV"
expect "plan limit overrides client max_guests" "25" "$(as $PLANNER false "select max_guests from events where id='$EV'")"
expect "planner cannot raise guest limit via update" "25" "$(as $PLANNER false "update events set max_guests=500 where id='$EV' returning max_guests")"
expect "planner cannot change own plan" "" "$(as $PLANNER false "update planners set plan='studio' returning plan")"
CODE=$($P -c "select join_code from events where id='$EV'")
expect "join code is 6 chars" "6" "$(echo -n $CODE | wc -c)"

expect "wrong code rejected" "EVENT_NOT_FOUND" "$(as $G1 true "select join_event('ZZZZZZ','Ada')")"
expect "guest joins (lowercase code ok)" "$EV" "$(as $G1 true "select join_event(lower('$CODE'),'Ada')")"
expect "rejoin is idempotent" "$EV" "$(as $G1 true "select join_event('$CODE','Ada B')")"
expect "guest sees event" "Wedding" "$(as $G1 true "select name from events where id='$EV'")"
expect "outsider cannot see event" "" "$(as $OUT false "select name from events where id='$EV'")"
expect "outsider cannot see guests" "0" "$(as $OUT false "select count(*) from guests")"

R1=$(as $G1 true "select photo_id||' '||storage_path from reserve_shot('$EV')")
expect "first shot reserved" "$EV/$G1/" "$R1"
R2=$(as $G1 true "select photo_id||' '||storage_path from reserve_shot('$EV')")
expect "second shot reserved" "$EV/$G1/" "$R2"
expect "third shot blocked (limit 2)" "NO_SHOTS_LEFT" "$(as $G1 true "select * from reserve_shot('$EV')")"
expect "shots_used = 2" "2" "$(as $G1 true "select shots_used('$EV')")"
expect "non-guest cannot shoot" "NOT_A_GUEST" "$(as $G2 true "select * from reserve_shot('$EV')")"

ID1=${R1%% *}; PATH1=${R1#* }; ID2=${R2%% *}; PATH2=${R2#* }
expect "guest uploads reserved path" "INSERT 0 1" "$(as $G1 true "insert into storage.objects (bucket_id,name) values ('photos','$PATH1') returning 'INSERT 0 1'")"
expect "guest cannot upload unreserved path" "row-level security" "$(as $G1 true "insert into storage.objects (bucket_id,name) values ('photos','$EV/$G1/spam.jpg')")"
expect "other user cannot upload to guest's path" "row-level security" "$(as $G2 true "insert into storage.objects (bucket_id,name) values ('photos','$PATH2')")"
as $G1 true "select confirm_shot('$ID1')" >/dev/null
as $G1 true "insert into storage.objects (bucket_id,name) values ('photos','$PATH2')" >/dev/null
as $G1 true "select confirm_shot('$ID2')" >/dev/null
expect "cannot re-upload confirmed path" "row-level security" "$(as $G1 true "insert into storage.objects (bucket_id,name) values ('photos','$PATH1')")"

expect "guest sees no photos before reveal" "0" "$(as $G1 true "select count(*) from photos")"
expect "guest cannot open files before reveal" "0" "$(as $G1 true "select count(*) from storage.objects")"
expect "planner sees all photos before reveal" "2" "$(as $PLANNER false "select count(*) from photos where uploaded")"
expect "planner can open files" "2" "$(as $PLANNER false "select count(*) from storage.objects")"
expect "guest cannot hide photos" "" "$(as $G1 true "update photos set hidden=true returning id")"
expect "guest cannot move reveal time" "" "$(as $G1 true "update events set reveal_at=now() returning id")"

as $PLANNER false "update photos set hidden=true where id='$ID2'" >/dev/null
as $PLANNER false "update events set reveal_at=now() where id='$EV'" >/dev/null
expect "guest sees revealed, non-hidden photos" "1" "$(as $G1 true "select count(*) from photos")"
expect "guest opens only visible file" "1" "$(as $G1 true "select count(*) from storage.objects")"
expect "outsider sees no photos after reveal" "0" "$(as $OUT false "select count(*) from photos")"
expect "outsider opens no files" "0" "$(as $OUT false "select count(*) from storage.objects")"
expect "camera closed after reveal" "EVENT_CLOSED" "$(as $G1 true "select * from reserve_shot('$EV')")"
expect "guest cannot delete files" "0" "$(as $G1 true "with d as (delete from storage.objects returning 1) select count(*) from d")"
expect "planner can delete files" "2" "$(as $PLANNER false "with d as (delete from storage.objects returning 1) select count(*) from d")"

# Guest limit: fill the event to 25 guests, then one more tries to join.
$P -c "insert into auth.users select gen_random_uuid() from generate_series(1,24) returning 1" >/dev/null
$P -c "insert into guests (event_id,user_id,display_name) select '$EV', id, 'x' from auth.users where id not in (select user_id from guests) and id not in ('$G2','$OUT','$PLANNER')" >/dev/null
expect "event full at plan limit" "EVENT_FULL" "$(as $G2 true "select join_event('$CODE','Late')")"
$P -c "update planners set plan='pro' where user_id='$PLANNER'; update events set name=name where id='$EV'" >/dev/null
expect "pro plan raises limit (applied by server)" "250" "$($P -c "select max_guests from events where id='$EV'")"
expect "late guest can join after upgrade" "$EV" "$(as $G2 true "select join_event('$CODE','Late')")"

# Release: a failed upload gives the shot back.
EV2=$(as $PLANNER false "insert into events (owner_id,name,starts_at,reveal_at,shots_per_guest) values ('$PLANNER','Party',now(),now()+interval '1h',1) returning id")
CODE2=$($P -c "select join_code from events where id='$EV2'")
as $G1 true "select join_event('$CODE2','Ada')" >/dev/null
R3=$(as $G1 true "select photo_id from reserve_shot('$EV2')")
as $G1 true "select release_shot('$R3')" >/dev/null
expect "released shot can be retaken" "$EV2/" "$(as $G1 true "select storage_path from reserve_shot('$EV2')")"

expect "another guest sees photographer's name on wall" "Ada B" "$(as $G2 true "select g.display_name from photos p join guests g on g.id = p.guest_id where p.event_id='$EV'")"
expect "outsider still sees no guest names" "0" "$(as $OUT false "select count(*) from guests")"

echo "---- $pass passed, $fail failed"
[ $fail -eq 0 ]

-- Read-only, aggregated diagnostics. No tokens, email, PIN or answer records.
select name,setting,unit from pg_settings where name in ('max_connections','shared_buffers','work_mem','statement_timeout');
select state,wait_event_type,count(*) as connections from pg_stat_activity where datname=current_database() group by state,wait_event_type;
select schemaname,relname,n_live_tup,n_dead_tup,seq_scan,idx_scan,last_autovacuum,last_autoanalyze from pg_stat_user_tables where schemaname in ('public','private','geodecoder_duel') order by n_dead_tup desc;
select schemaname,relname,indexrelname,idx_scan,pg_relation_size(indexrelid) as index_bytes from pg_stat_user_indexes where schemaname in ('public','private','geodecoder_duel') order by pg_relation_size(indexrelid) desc;
select relname,n_tup_ins,n_tup_upd,n_tup_del from pg_stat_user_tables where schemaname in ('public','private','geodecoder_duel') order by n_tup_upd desc;
select count(*) as blocked_sessions from pg_stat_activity where datname=current_database() and cardinality(pg_blocking_pids(pid))>0;

create or replace function public.geo_action(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.geo_action(action,payload); $$;
create or replace function public.geo_provision(p_user_id uuid,p_username text,p_display_name text,p_role text,p_auth_email text,p_recovery_hash text)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.provision(p_user_id,p_username,p_display_name,p_role,p_auth_email,p_recovery_hash); $$;
create or replace function public.geo_identity(p_username text)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.identity(p_username); $$;
create or replace function public.geo_rate_guard(p_key text,p_limit integer,p_window integer)
returns boolean language sql volatile security invoker set search_path=''
as $$ select private.rate_guard(p_key,p_limit,p_window); $$;

revoke execute on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function private.geo_action(text,jsonb),private.can_view_room(uuid) to authenticated;
grant execute on function private.provision(uuid,text,text,text,text,text),private.identity(text),private.rate_guard(text,integer,integer) to service_role;
revoke all on function public.geo_action(text,jsonb),public.geo_provision(uuid,text,text,text,text,text),
  public.geo_identity(text),public.geo_rate_guard(text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.geo_action(text,jsonb) to authenticated;
grant execute on function public.geo_provision(uuid,text,text,text,text,text),public.geo_identity(text),
  public.geo_rate_guard(text,integer,integer) to service_role;

-- Realtime delivers only sanitized rows and applies the SELECT policy per subscriber.
do $publication$
begin
  if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename='room_progress') then
    alter publication supabase_realtime add table public.room_progress;
  end if;
end
$publication$;

-- Bank is inserted below from dist/questions.mjs by the source preparation step.

insert into private.questions(id,shape,topic,prompt,hint) values
  ('P1','pyramid','properties','Bongkah apakah ini? Tapak persegi dengan 4 muka segi tiga.','Muka sisi akan bertemu pada puncak apabila dilipat.'),
  ('P2','pyramid','formula','V=a^2*t/3; t=tinggi a=sisi tapak persegi Bongkah apakah ini?','a^2 ialah luas tapak. Fikir bentuk muka sisi bongkah.'),
  ('P3','pyramid','net','Pilih bentangan bagi 1 segi empat sama dan 4 segi tiga.','Lipat sisinya di sisi petak hingga bertemu di 1 puncak.'),
  ('S1','cylinder','properties','Tin minuman ada dua tapak bulatan sama. Bongkah apakah ini?','2 tapak bulat sama saiz disambung oleh sisi melengkung'),
  ('S2','cylinder','formula','V=pi*j^2*t L=2*pi*j*(j+t) Bongkah apakah ini?','j=jejari dan t=tinggi. Tapak atas dan bawah sama saiz.'),
  ('S3','cylinder','net','Pilih bentangan: 2 bulatan sama saiz, 1 segi empat tepat.','Lengkungkan segi empat itu; dua bulatan jadi tapak.'),
  ('K1','cube','properties','Enam muka berbentuk segi empat sama. Bongkah apakah ini?','12 rusuk sama panjang. Setiap muka sama bentuk dan saiz'),
  ('K2','cube','formula','V=a^3; L=6*a^2 a=panjang rusuk Bongkah apakah ini?','Panjang, lebar serta tinggi sama bagi bongkah ini.'),
  ('K3','cube','net','Pilih bentangan: 6 segi empat sama, semuanya sama saiz.','Bayangkan muka dilipat jadi kotak tanpa muka bertindih'),
  ('C1','cone','formula','V=pi*j^2*t/3 j=jejari; t=tinggi. Bongkah apakah ini?','Lihat tapaknya yang bulat. Sisinya mengecil ke puncak.'),
  ('C2','cone','formula','L=pi*j*(j+s) j=jejari; s=tinggi sendeng. Bentuk apa?','Tinggi sendeng diukur ikut sisi dari tapak ke puncak'),
  ('C3','cone','net','Pilih bentangan yang ada 1 sektor bulatan dan 1 bulatan.','Rapatkan sisi lurus pada sektor. Bulatan jadi tapak.'),
  ('B1','cuboid','properties','Kotak ini mempunyai 3 ukuran berbeza. Bongkah apakah ini?','Lihat panjang, lebar serta tinggi. Muka berhadapan sama'),
  ('B2','cuboid','formula','V=p*l*t; p,l,t ialah 3 ukuran berbeza. Bongkah apakah ini?','p=panjang, l=lebar, t=tinggi. Lihat kotak kasut.'),
  ('B3','cuboid','net','Kotak: 6cm x 4cm dengan tinggi 3cm. Pilih bentangannya.','Padankan muka yang sama saiz, lalu lipat menjadi kotak.')
on conflict(id) do update set shape=excluded.shape,topic=excluded.topic,prompt=excluded.prompt,hint=excluded.hint;



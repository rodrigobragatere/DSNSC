-- Estado (UF) e cidade nos cadastros
alter table public.cadastros
  add column if not exists estado text not null default '';

alter table public.cadastros
  add column if not exists cidade text not null default '';

create index if not exists cadastros_estado_idx on public.cadastros (estado);
create index if not exists cadastros_cidade_idx on public.cadastros (cidade);

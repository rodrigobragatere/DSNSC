-- E-mail único (case-insensitive) nos cadastros
create unique index if not exists cadastros_email_unique_idx
  on public.cadastros (lower(email));

import { NextResponse } from 'next/server';

const MISSING_DB_MSG =
  'Baza podataka nije podešena: nedostaje DATABASE_URL. Lokalno dodajte je u .env; na serveru je dodajte u environment variables aplikacije.';

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function databaseUrlMissingResponse() {
  return NextResponse.json({ error: MISSING_DB_MSG }, { status: 503 });
}

const SCHEMA_MISMATCH_MSG =
  'Baza nije usklađena sa aplikacijom. Na serveru pokrenite migracije (npr. npx prisma migrate deploy u build koraku).';

export function responseFromDatabaseError(error) {
  const msg = String(error?.message || '');
  const code = error?.code != null ? String(error.code) : '';

  if (
    !hasDatabaseUrl() ||
    msg.includes('DATABASE_URL') ||
    msg.includes('Environment variable not found') ||
    msg.includes('schema.prisma')
  ) {
    return NextResponse.json({ error: MISSING_DB_MSG }, { status: 503 });
  }

  if (code && code.startsWith('P')) {
    if (['P1001', 'P1002', 'P1003', 'P1017', 'P1011'].includes(code)) {
      return NextResponse.json(
        {
          error:
            'Baza podataka trenutno nije dostupna. Pokušajte kasnije ili kontaktirajte podršku.',
        },
        { status: 503 }
      );
    }
    if (['P2021', 'P2022'].includes(code)) {
      return NextResponse.json({ error: SCHEMA_MISMATCH_MSG }, { status: 503 });
    }
  }

  const name = error?.name || '';
  if (
    name === 'PrismaClientInitializationError' ||
    name === 'PrismaClientRustPanicError'
  ) {
    return NextResponse.json(
      {
        error:
          'Baza podataka trenutno nije dostupna. Proverite DATABASE_URL i mrežu.',
      },
      { status: 503 }
    );
  }

  if (msg.includes('reach database server') || msg.includes('P1001')) {
    return NextResponse.json(
      {
        error:
          'Baza podataka trenutno nije dostupna. Pokušajte kasnije ili kontaktirajte podršku.',
      },
      { status: 503 }
    );
  }

  if (
    /can't reach database server|connection refused|connection timed out|server has closed the connection|too many connections/i.test(
      msg
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Baza podataka trenutno nije dostupna. Pokušajte kasnije ili kontaktirajte podršku.',
      },
      { status: 503 }
    );
  }

  return null;
}

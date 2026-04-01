import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import {
  databaseUrlMissingResponse,
  hasDatabaseUrl,
  responseFromDatabaseError,
} from '../../../../lib/dbClientErrors';
import { isDisposableEmail } from '../../../../lib/emailPolicy';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/auth/register',
    method: 'POST',
    message: 'Use POST to create a new account.',
  });
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Neispravan format zahteva.' }, { status: 400 });
    }
    const {
      email,
      password,
      name,
      role,
      primaryInstrument,
      city,
      genres,
      experienceYears,
      priceFromEur,
      priceToEur,
      bio,
    } = body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '').trim();
    const normalizedRole = ['BAND', 'CLIENT', 'MUSICIAN'].includes(role)
      ? role
      : 'CLIENT';
    const normalizedName = String(name || '').trim();
    const normalizedInstrument = String(primaryInstrument || '').trim();
    const normalizedCity = String(city || '').trim();
    const normalizedGenres = String(genres || '').trim();
    const normalizedBio = String(bio || '').trim();
    const normalizedExperience = experienceYears ? Number(experienceYears) : null;
    const normalizedPriceFrom = priceFromEur ? Number(priceFromEur) : null;
    const normalizedPriceTo = priceToEur ? Number(priceToEur) : null;

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: 'Email i lozinka su obavezni.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email format nije ispravan.' }, { status: 400 });
    }

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Privremene email adrese nisu dozvoljene.' },
        { status: 400 }
      );
    }

    if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
      return NextResponse.json(
        { error: 'Lozinka mora imati 6-128 karaktera.' },
        { status: 400 }
      );
    }

    if ((normalizedRole === 'BAND' || normalizedRole === 'MUSICIAN') && !normalizedName) {
      return NextResponse.json(
        { error: 'Naziv benda ili ime je obavezno.' },
        { status: 400 }
      );
    }

    if (normalizedRole === 'MUSICIAN') {
      if (!normalizedInstrument) {
        return NextResponse.json(
          { error: 'Instrument je obavezan za muzičare.' },
          { status: 400 }
        );
      }
      if (!normalizedCity) {
        return NextResponse.json(
          { error: 'Grad je obavezan za muzičare.' },
          { status: 400 }
        );
      }
    }

    if (normalizedName.length > 120) {
      return NextResponse.json({ error: 'Ime/naziv je predugačak.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            'Registracija sa unetim podacima nije moguća. Ako već imate nalog, prijavite se.',
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    let userData = {
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
    };

    if (normalizedRole === 'BAND') {
      const newUser = await prisma.user.create({
        data: {
          ...userData,
          band: {
            create: {
              name: normalizedName || 'Novi Bend',
              genre: 'Mixed',
              location: 'Beograd',
            }
          }
        }
      });
      return NextResponse.json({ success: true, role: newUser.role });
    } else if (normalizedRole === 'MUSICIAN') {
      const newUser = await prisma.user.create({
        data: {
          ...userData,
          musicianProfile: {
            create: {
              name: normalizedName || 'Novi Muzičar',
              primaryInstrument: normalizedInstrument,
              city: normalizedCity,
              genres: normalizedGenres || null,
              experienceYears:
                Number.isFinite(normalizedExperience) && normalizedExperience >= 0
                  ? normalizedExperience
                  : null,
              priceFromEur:
                Number.isFinite(normalizedPriceFrom) && normalizedPriceFrom >= 0
                  ? normalizedPriceFrom
                  : null,
              priceToEur:
                Number.isFinite(normalizedPriceTo) && normalizedPriceTo >= 0
                  ? normalizedPriceTo
                  : null,
              bio: normalizedBio || null,
            },
          },
        },
      });
      return NextResponse.json({ success: true, role: newUser.role });
    } else {
      const newUser = await prisma.user.create({
        data: userData
      });
      return NextResponse.json({ success: true, role: newUser.role });
    }

  } catch (error) {
    console.error('Registration Error:', error);

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { error: 'Neispravan unos podataka. Proverite sva polja i pokušajte ponovo.' },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : String(target || '');
        return NextResponse.json(
          {
            error: field.includes('email')
              ? 'Ovaj email je već registrovan. Prijavite se ili upotrebite drugi email.'
              : 'Podatak mora biti jedinstven. Proverite unos.',
          },
          { status: 400 }
        );
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Greška povezivanja podataka. Pokušajte ponovo.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error:
            'Greška pri čuvanju naloga. Ako se ponavlja, proverite da li je baza ažurirana (migracije).',
        },
        { status: 503 }
      );
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      const safe = responseFromDatabaseError(error);
      if (safe) return safe;
      return NextResponse.json(
        { error: 'Greška baze podataka. Pokušajte ponovo za nekoliko minuta.' },
        { status: 503 }
      );
    }

    const safe = responseFromDatabaseError(error);
    if (safe) return safe;

    return NextResponse.json(
      { error: 'Greška pri registraciji. Pokušajte ponovo ili kontaktirajte podršku.' },
      { status: 500 }
    );
  }
}

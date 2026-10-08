import type { BuilderCardFields, BuilderCardView } from '../types';

function toString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`BuilderCard field ${field} is missing or invalid.`);
  }
  return value;
}

function toBuilderNumber(value: unknown): string {
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  throw new Error('BuilderCard field builder_no is missing or invalid.');
}

function parseSkills(raw: string): string[] {
  return raw
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeOwner(owner: unknown): string {
  if (owner == null) return '';
  if (typeof owner === 'string') return owner;
  if (typeof owner === 'object') {
    const record = owner as Record<string, unknown>;
    if (typeof record.AddressOwner === 'string') {
      return record.AddressOwner;
    }
    if (typeof record.ObjectOwner === 'string') {
      return record.ObjectOwner;
    }
    if (typeof record.Shared === 'object' && record.Shared !== null) {
      return 'Shared';
    }
    if (record.Immutable === true) {
      return 'Immutable';
    }
  }
  try {
    return JSON.stringify(owner);
  } catch {
    return '';
  }
}

export function mapBuilderCard(
  fields: Record<string, unknown>,
  objectId: string,
  owner: unknown,
  networkLabel: string,
): BuilderCardView {
  const builderFields: BuilderCardFields = {
    builder_name: toString(fields.builder_name, 'builder_name'),
    builder_no: toBuilderNumber(fields.builder_no),
    profession: toString(fields.profession, 'profession'),
    program: toString(fields.program, 'program'),
    country: toString(fields.country, 'country'),
    specialization: toString(fields.specialization, 'specialization'),
    building_since: toString(fields.building_since, 'building_since'),
    focus: toString(fields.focus, 'focus'),
    community: toString(fields.community, 'community'),
    skills: toString(fields.skills, 'skills'),
    issued: toString(fields.issued, 'issued'),
    about: toString(fields.about, 'about'),
    website_url: toString(fields.website_url, 'website_url'),
    photo_url: toString(fields.photo_url, 'photo_url'),
  };

  return {
    fields: builderFields,
    skills: parseSkills(builderFields.skills),
    objectId,
    owner: normalizeOwner(owner),
    networkLabel,
  };
}

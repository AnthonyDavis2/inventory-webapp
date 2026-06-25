import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  await seedGlobalUOMs()
  console.log('✓ Global UOMs seeded')

  console.log('Seeding complete.')
}

async function seedGlobalUOMs() {
  const uoms = [
    // Count
    { name: 'Each', abbreviation: 'ea', type: 'EACH', is_global: true },
    { name: 'Dozen', abbreviation: 'doz', type: 'EACH', is_global: true },
    { name: 'Hundred', abbreviation: 'hun', type: 'EACH', is_global: true },
    { name: 'Box', abbreviation: 'box', type: 'EACH', is_global: true },
    { name: 'Case', abbreviation: 'cs', type: 'EACH', is_global: true },
    { name: 'Pallet', abbreviation: 'plt', type: 'EACH', is_global: true },
    { name: 'Roll', abbreviation: 'rl', type: 'EACH', is_global: true },
    { name: 'Bag', abbreviation: 'bag', type: 'EACH', is_global: true },
    { name: 'Drum', abbreviation: 'drm', type: 'EACH', is_global: true },
    // Weight
    { name: 'Pound', abbreviation: 'lb', type: 'WEIGHT', is_global: true },
    { name: 'Ounce', abbreviation: 'oz', type: 'WEIGHT', is_global: true },
    { name: 'Ton (short)', abbreviation: 'ton', type: 'WEIGHT', is_global: true },
    { name: 'Kilogram', abbreviation: 'kg', type: 'WEIGHT', is_global: true },
    { name: 'Gram', abbreviation: 'g', type: 'WEIGHT', is_global: true },
    { name: 'Milligram', abbreviation: 'mg', type: 'WEIGHT', is_global: true },
    // Volume
    { name: 'Gallon', abbreviation: 'gal', type: 'VOLUME', is_global: true },
    { name: 'Quart', abbreviation: 'qt', type: 'VOLUME', is_global: true },
    { name: 'Pint', abbreviation: 'pt', type: 'VOLUME', is_global: true },
    { name: 'Fluid Ounce', abbreviation: 'fl oz', type: 'VOLUME', is_global: true },
    { name: 'Liter', abbreviation: 'L', type: 'VOLUME', is_global: true },
    { name: 'Milliliter', abbreviation: 'mL', type: 'VOLUME', is_global: true },
    // Length
    { name: 'Foot', abbreviation: 'ft', type: 'LENGTH', is_global: true },
    { name: 'Inch', abbreviation: 'in', type: 'LENGTH', is_global: true },
    { name: 'Yard', abbreviation: 'yd', type: 'LENGTH', is_global: true },
    { name: 'Meter', abbreviation: 'm', type: 'LENGTH', is_global: true },
    { name: 'Centimeter', abbreviation: 'cm', type: 'LENGTH', is_global: true },
    { name: 'Millimeter', abbreviation: 'mm', type: 'LENGTH', is_global: true },
    // Area
    { name: 'Square Foot', abbreviation: 'sq ft', type: 'AREA', is_global: true },
    { name: 'Square Meter', abbreviation: 'sq m', type: 'AREA', is_global: true },
    // Time
    { name: 'Hour', abbreviation: 'hr', type: 'TIME', is_global: true },
    { name: 'Minute', abbreviation: 'min', type: 'TIME', is_global: true },
  ]

  for (const uom of uoms) {
    await prisma.unitOfMeasure.upsert({
      where: { org_id_abbreviation: { org_id: null as unknown as string, abbreviation: uom.abbreviation } },
      update: {},
      create: { ...uom, org_id: null } as Parameters<typeof prisma.unitOfMeasure.create>[0]['data'],
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

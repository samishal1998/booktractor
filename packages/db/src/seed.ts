import path from 'node:path';
import { promises as fs } from 'node:fs';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { auth } from '../auth';
import {
  businessAccounts,
  userAccounts,
  machineTemplates,
  machineInstances,
  machineBookings,
  payments,
  tags,
  BookingStatus,
  type BusinessAccount,
  type BookingMessage,
  type AvailabilityJson,
} from './schemas/business';
import { users as usersTable } from './schemas/auth';

type SeedCompany = {
  companyName: string;
  contactName: string;
  email: string;
  password: string;
};

type SeedAccountRecord = {
  seed: SeedCompany;
  user: typeof usersTable.$inferSelect;
  account: BusinessAccount;
};

type CredentialEntry = {
  company: string;
  contact: string;
  email: string;
  password: string;
  accountId: string;
  userId: string;
};

const credsOutputPath = path.resolve(__dirname, '../../creds.json');

const credentials = {
  owners: [] as CredentialEntry[],
  clients: [] as CredentialEntry[],
};

const DAY_OPTIONS = [
  { key: 'mon', start: '08:00', end: '18:00' },
  { key: 'tue', start: '08:00', end: '18:00' },
  { key: 'wed', start: '08:00', end: '18:00' },
  { key: 'thu', start: '08:00', end: '18:00' },
  { key: 'fri', start: '08:00', end: '18:00' },
  { key: 'sat', start: '08:00', end: '14:00' },
  { key: 'sun', start: '', end: '' },
] as const;

const createTimeSlot = (start: string, end: string) => ({
  start: new Date(`1970-01-01T${start || '00:00'}:00.000Z`),
  end: new Date(`1970-01-01T${end || '00:00'}:00.000Z`),
});

const buildDefaultBaseAvailability = (): AvailabilityJson['base'] => {
  const base: AvailabilityJson['base'] = {};
  DAY_OPTIONS.forEach(({ key, start, end }) => {
    if (!start || !end) {
      return;
    }
    base[key] = [createTimeSlot(start, end)];
  });
  return base;
};

const ownerSeeds: SeedCompany[] = [
  {
    companyName: 'Atlas Heavy Rentals',
    contactName: 'Ava Patel',
    email: 'ava@atlasheavy.co',
    password: 'OwnerAtlas#123',
  },
  {
    companyName: 'Cascade Earthworks',
    contactName: 'Liam Chen',
    email: 'liam@cascadeearthworks.com',
    password: 'OwnerCascade#123',
  },
  {
    companyName: 'Summit Lift & Rigging',
    contactName: 'Maya Ortiz',
    email: 'maya@summitlift.com',
    password: 'OwnerSummit#123',
  },
];

const clientSeeds: SeedCompany[] = [
  {
    companyName: 'Northwind Construction',
    contactName: 'Brooke Lang',
    email: 'brooke@northwindbuild.com',
    password: 'ClientNorthwind#123',
  },
  {
    companyName: 'Cobalt Infrastructure',
    contactName: 'Ethan Reeves',
    email: 'ethan@cobaltinfrastructure.com',
    password: 'ClientCobalt#123',
  },
  {
    companyName: 'Harborview Developers',
    contactName: 'Noah Clarke',
    email: 'noah@harborviewdev.com',
    password: 'ClientHarborview#123',
  },
];

const machineData = [
  {
    name: 'John Deere 6120M Tractor',
    code: 'JD6120M',
    category: 'Tractor',
    description: 'Versatile utility tractor perfect for farming and construction. Features 120 HP engine, air-conditioned cab, and advanced hydraulics.',
    pricePerHour: 7500, // $75.00
    totalCount: 3,
  },
  {
    name: 'Caterpillar 320 Excavator',
    code: 'CAT320',
    category: 'Excavator',
    description: 'Medium hydraulic excavator with 20-ton operating weight. Ideal for general construction, demolition, and landscaping.',
    pricePerHour: 12000, // $120.00
    totalCount: 2,
  },
  {
    name: 'Komatsu D65PX-18 Bulldozer',
    code: 'KOM-D65',
    category: 'Bulldozer',
    description: 'Powerful crawler dozer with 215 HP. Perfect for grading, clearing, and heavy earthmoving.',
    pricePerHour: 15000, // $150.00
    totalCount: 2,
  },
  {
    name: 'Bobcat S650 Skid Steer Loader',
    code: 'BOB-S650',
    category: 'Loader',
    description: 'Compact and maneuverable skid steer loader. Great for tight spaces, landscaping, and material handling.',
    pricePerHour: 6000, // $60.00
    totalCount: 4,
  },
  {
    name: 'Liebherr LTM 1050-3.1 Mobile Crane',
    code: 'LIE-LTM1050',
    category: 'Crane',
    description: '50-ton mobile crane with 36m telescopic boom. Perfect for construction lifting operations.',
    pricePerHour: 25000, // $250.00
    totalCount: 1,
  },
  {
    name: 'Case 850M Crawler Dozer',
    code: 'CASE-850M',
    category: 'Bulldozer',
    description: 'Compact dozer with excellent maneuverability. Ideal for residential and light commercial work.',
    pricePerHour: 9500, // $95.00
    totalCount: 2,
  },
  {
    name: 'Volvo EC480D Excavator',
    code: 'VOL-EC480',
    category: 'Excavator',
    description: 'Large excavator with 48-ton operating weight. Heavy-duty performance for mining and quarrying.',
    pricePerHour: 18000, // $180.00
    totalCount: 1,
  },
  {
    name: 'JCB 3CX Backhoe Loader',
    code: 'JCB-3CX',
    category: 'Loader',
    description: 'Versatile backhoe loader for digging, loading, and material handling. Popular choice for utilities work.',
    pricePerHour: 8000, // $80.00
    totalCount: 3,
  },
  {
    name: 'Caterpillar CS54B Compactor',
    code: 'CAT-CS54B',
    category: 'Compactor',
    description: 'Vibratory soil compactor for road construction. Achieves excellent compaction on various soil types.',
    pricePerHour: 7000, // $70.00
    totalCount: 2,
  },
  {
    name: 'Kubota M7-172 Tractor',
    code: 'KUB-M7172',
    category: 'Tractor',
    description: 'High-performance agricultural tractor with 170 HP. Features CVT transmission and precision farming technology.',
    pricePerHour: 8500, // $85.00
    totalCount: 2,
  },
];

const tagData = [
  { name: 'Heavy Duty', slug: 'heavy-duty', color: '#ef4444' },
  { name: 'Eco Friendly', slug: 'eco-friendly', color: '#10b981' },
  { name: 'GPS Enabled', slug: 'gps-enabled', color: '#3b82f6' },
  { name: 'Recently Serviced', slug: 'recently-serviced', color: '#8b5cf6' },
  { name: 'Popular', slug: 'popular', color: '#f59e0b' },
];

async function resetDomainData() {
  console.log('🧹 Clearing existing business data...');
  await db.delete(payments);
  await db.delete(machineBookings);
  await db.delete(machineInstances);
  await db.delete(machineTemplates);
  await db.delete(tags);
  await db.delete(userAccounts);
  await db.delete(businessAccounts);
  console.log('  ✓ Cleared payments, bookings, machines, tags, and account links');
}

async function ensureAuthUser(seed: SeedCompany) {
  const normalizedEmail = seed.email.toLowerCase();
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existingUser.length > 0) {
    const existingRecord = existingUser[0];
    if (existingRecord) {
      await db.delete(usersTable).where(eq(usersTable.id, existingRecord.id));
      console.log(`  ℹ Removed existing user (${normalizedEmail}) to recreate with known credentials`);
    }
  }

  const created = (await auth.api.signUpEmail({
    body: {
      name: seed.contactName,
      email: normalizedEmail,
      password: seed.password,
    },
  })) as unknown as { user?: typeof usersTable.$inferSelect };

  if (!created?.user) {
    throw new Error(`BetterAuth did not return a user for ${normalizedEmail}`);
  }

  await db
    .update(usersTable)
    .set({ emailVerified: true })
    .where(eq(usersTable.id, created.user.id));

  const [userRecord] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, created.user.id));

  if (!userRecord) {
    throw new Error(`Unable to fetch created user for ${normalizedEmail}`);
  }

  console.log(`  ✓ Created auth user: ${normalizedEmail}`);
  return userRecord;
}

async function createAccountForUser(
  seed: SeedCompany,
  user: typeof usersTable.$inferSelect,
  type: 'renter' | 'client'
) {
  const [account] = await db
    .insert(businessAccounts)
    .values({
      name: seed.companyName,
      type,
    })
    .returning();

  if (!account) {
    throw new Error(`Failed to create ${type} account for ${seed.companyName}`);
  }

  await db.insert(userAccounts).values({
    userId: user.id,
    accountId: account.id,
    role: 'account_admin',
  });

  const entry: CredentialEntry = {
    company: seed.companyName,
    contact: seed.contactName,
    email: seed.email.toLowerCase(),
    password: seed.password,
    accountId: account.id,
    userId: user.id,
  };

  if (type === 'renter') {
    credentials.owners.push(entry);
  } else {
    credentials.clients.push(entry);
  }

  console.log(`  ✓ Created ${type} account: ${seed.companyName} (${account.id})`);
  return account;
}

function buildConversation({
  client,
  owner,
  templateName,
}: {
  client: SeedAccountRecord;
  owner: SeedAccountRecord;
  templateName: string;
}): BookingMessage[] {
  const now = Date.now();

  return [
    {
      sender_id: client.user.id,
      content: `Hi ${owner.seed.contactName}, we need the ${templateName} on site next week. Can you confirm availability?`,
      ts: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      sender_id: owner.user.id,
      content: `Thanks ${client.seed.contactName}! ${templateName} is free for those dates. I'll hold an instance until you finalize.`,
      ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      sender_id: client.user.id,
      content: 'Confirmed. Please proceed with the reservation and send over the deposit details.',
      ts: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    await resetDomainData();

    console.log('\n👥 Creating owner accounts via BetterAuth...');
    const ownerAccounts: SeedAccountRecord[] = [];
    for (const owner of ownerSeeds) {
      const user = await ensureAuthUser(owner);
      const account = await createAccountForUser(owner, user, 'renter');
      ownerAccounts.push({ seed: owner, user, account });
    }

    console.log('\n🏗️ Creating client accounts via BetterAuth...');
    const clientAccounts: SeedAccountRecord[] = [];
    for (const client of clientSeeds) {
      const user = await ensureAuthUser(client);
      const account = await createAccountForUser(client, user, 'client');
      clientAccounts.push({ seed: client, user, account });
    }

    console.log('\n🏷️ Creating tags...');
    for (const tag of tagData) {
      await db.insert(tags).values(tag).onConflictDoNothing();
      console.log(`  ✓ Tag upserted: ${tag.name}`);
    }

    console.log('\n🛠️ Creating machine templates and instances...');
    let machineIndex = 0;
    const allTemplates: typeof machineTemplates.$inferSelect[] = [];

    for (const machine of machineData) {
      const ownerRecord = ownerAccounts[machineIndex % ownerAccounts.length];
      if (!ownerRecord) {
        throw new Error('Owner account missing while seeding machines');
      }
      const templateAvailability: AvailabilityJson = {
        base: buildDefaultBaseAvailability(),
        overrides: {},
      };

      const templateResults = await db
        .insert(machineTemplates)
        .values({
          accountId: ownerRecord.account.id,
          name: machine.name,
          code: machine.code,
          description: machine.description,
          specs: {
            category: machine.category,
          },
          pricePerHour: machine.pricePerHour,
          totalCount: machine.totalCount,
          availabilityJson: templateAvailability,
        })
        .returning();
      const template = templateResults[0];

      if (!template) {
        throw new Error(`Failed to insert template for ${machine.name}`);
      }

      for (let i = 1; i <= machine.totalCount; i++) {
        await db.insert(machineInstances).values({
          templateId: template.id,
          instanceCode: `${machine.code}-${String(i).padStart(3, '0')}`,
          status: 'active',
          availabilityJson: templateAvailability,
        });
      }

      console.log(
        `  ✓ Created template ${machine.name} for ${ownerRecord.seed.companyName} (${machine.totalCount} instances)`
      );

      allTemplates.push(template);
      machineIndex++;
    }

    console.log('\n📅 Creating sample bookings with conversations...');
    const allInstances = await db.select().from(machineInstances);

    for (let i = 0; i < 8; i++) {
      const clientRecord = clientAccounts[i % clientAccounts.length];
      const ownerRecord = ownerAccounts[i % ownerAccounts.length];
      const template = allTemplates[i % allTemplates.length];
      if (!clientRecord || !ownerRecord || !template) {
        throw new Error('Seed data missing relationships for booking creation');
      }
      const instances = allInstances.filter((inst) => inst.templateId === template.id);

      if (instances.length === 0) continue;

      const startTime = new Date(Date.now() + (i + 1) * 5 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (2 + (i % 3)) * 24 * 60 * 60 * 1000);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const totalCost = Math.round(hours * (template.pricePerHour || 0));
      const depositAmount = Math.round(totalCost * 0.35);

      const statusSequence = [
        BookingStatus.PENDING_RENTER_APPROVAL,
        BookingStatus.SENT_BACK_TO_CLIENT,
        BookingStatus.APPROVED_BY_RENTER,
        BookingStatus.REJECTED_BY_RENTER,
        BookingStatus.CANCELED_BY_CLIENT,
      ];
      const status = statusSequence[i % statusSequence.length];

      const targetInstance = instances[0];
      if (!targetInstance) {
        continue;
      }

      const bookingResults = await db
        .insert(machineBookings)
        .values({
          machineInstanceId: targetInstance.id,
          templateId: template.id,
          clientAccountId: clientRecord.account.id,
          clientUserId: clientRecord.user.id,
          label: `${clientRecord.seed.companyName} - ${template.name}`,
          startTime,
          endTime,
          status,
          messages: buildConversation({
            client: clientRecord,
            owner: ownerRecord,
            templateName: template.name,
          }),
        })
        .returning();
      const booking = bookingResults[0];

      if (!booking) {
        continue;
      }

      if (
        status === BookingStatus.APPROVED_BY_RENTER ||
        status === BookingStatus.SENT_BACK_TO_CLIENT
      ) {
        await db.insert(payments).values({
          bookingId: booking.id,
          externalId: `pi_mock_${booking.id}`,
          amountCents: depositAmount,
          status: 'completed',
          provider: 'stripe',
        });
      }

      console.log(
        `  ✓ Booking ${booking.id.slice(0, 8)} for ${clientRecord.seed.companyName} (${status})`
      );
    }

    await fs.writeFile(credsOutputPath, JSON.stringify(credentials, null, 2));
    console.log(`\n🗂️  Credentials saved to ${credsOutputPath}`);

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`  - ${ownerAccounts.length} owner accounts`);
    console.log(`  - ${clientAccounts.length} client accounts`);
    console.log(`  - ${tagData.length} tags`);
    console.log(`  - ${machineData.length} machine templates`);
    console.log(`  - ${machineData.reduce((sum, m) => sum + m.totalCount, 0)} machine instances`);
    console.log('  - 8 sample bookings with conversations and deposits');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function seed() {
  const email = "misheelmother@gmail.com";

  let user = await prisma.user.findUnique({ where: { email } });
  let tenantId;

  if (!user) {
    console.log(`Creating user ${email}...`);
    const tenant = await prisma.tenant.create({ data: { name: "Mother's Org" } });
    tenantId = tenant.id;

    // Create Role
    const role = await prisma.role.create({
      data: { tenantId, name: 'Admin', permissions: ['*'] }
    });

    user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name: "Misheel",
        roleId: role.id,
        password: await bcrypt.hash("password", 10)
      }
    });
  } else {
    tenantId = user.tenantId;
    console.log(`User ${email} already exists.`);
  }

  console.log("Seeding companies...");
  const company1 = await prisma.company.create({
    data: { tenantId, name: 'Google Cloud', phone: '+1 555-0101', email: 'cloud@google.com', status: 'Active' }
  });
  const company2 = await prisma.company.create({
    data: { tenantId, name: 'Microsoft Azure', phone: '+1 555-0202', email: 'azure@microsoft.com', status: 'Active' }
  });
  const company3 = await prisma.company.create({
    data: { tenantId, name: 'Vercel Inc.', phone: '+1 555-0303', email: 'hello@vercel.com', status: 'Lead' }
  });

  console.log("Seeding deals (fake products)...");
  await prisma.deal.create({
    data: { tenantId, companyId: company1.id, title: 'Compute Engine Enterprise', value: 120000, stage: 'Won' }
  });
  await prisma.deal.create({
    data: { tenantId, companyId: company2.id, title: 'Azure DevOps Migration', value: 45000, stage: 'Proposal' }
  });
  await prisma.deal.create({
    data: { tenantId, companyId: company3.id, title: 'Vercel Deployment SLA', value: 12000, stage: 'Qualified' }
  });
  await prisma.deal.create({
    data: { tenantId, companyId: company1.id, title: 'BigQuery Contract Renewal', value: 250000, stage: 'Won' }
  });

  console.log("Seeding fake contacts...");
  // Fake "contacts" - using the company model since schema.prisma doesn't have a distinct Contact model
  await prisma.company.create({
    data: { tenantId, name: 'Jane Doe', phone: '+1 888-0001', email: 'jane.d@example.com', status: 'Active' }
  });
  await prisma.company.create({
    data: { tenantId, name: 'John Smith', phone: '+1 888-0002', email: 'smith.j@example.com', status: 'Lead' }
  });
  await prisma.company.create({
    data: { tenantId, name: 'Alice Walker', phone: '+1 888-0003', email: 'alice.w@example.com', status: 'Inactive' }
  });

  console.log('Seed completed successfully for', email);
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});

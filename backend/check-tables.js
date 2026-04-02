require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('📋 Tables in database:');
    if (tables.length === 0) {
      console.log('   No tables found. You may need to run migrations.');
    } else {
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
